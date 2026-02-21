import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

interface User {
  id: number | string;
  email: string;
  role?: { name?: string; type?: string };
  auth_provider?: string;
}

interface AccessTokenClaims {
  sub: string;
  email: string;
  role: string;
  provider: string;
  iss: string;
  aud: string;
}

interface RefreshTokenOptions {
  deviceType?: 'web' | 'ios' | 'android';
  deviceInfo?: string;
  ipAddress?: string;
}

/**
 * Token service implementing ADR-002 dual-token strategy:
 * - Access token: RS256 JWT, 15-minute expiry, stored in memory on clients
 * - Refresh token: Opaque UUID, 7-day expiry, stored in DB (hashed), secure storage on clients
 */
const tokenService = ({ strapi }) => ({
  /**
   * Generate a short-lived RS256 JWT access token (15 min).
   * Claims structure per ADR-002.
   */
  generateAccessToken(user: User): string {
    const privateKey = process.env.JWT_PRIVATE_KEY;
    const expiresIn = process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || '15m';

    if (!privateKey) {
      // Fall back to HS256 for local development when no RSA key is configured
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        throw new Error('JWT_SECRET or JWT_PRIVATE_KEY must be set');
      }

      return jwt.sign(
        {
          sub: String(user.id),
          email: user.email,
          role: user.role?.type || user.role?.name || 'reader',
          provider: user.auth_provider || 'local',
        },
        secret,
        {
          algorithm: 'HS256',
          expiresIn,
          issuer: 'blog-platform-api',
          audience: 'blog-platform-clients',
        }
      );
    }

    return jwt.sign(
      {
        sub: String(user.id),
        email: user.email,
        role: user.role?.type || user.role?.name || 'reader',
        provider: user.auth_provider || 'local',
      } as Partial<AccessTokenClaims>,
      privateKey,
      {
        algorithm: 'RS256',
        expiresIn,
        issuer: 'blog-platform-api',
        audience: 'blog-platform-clients',
      }
    );
  },

  /**
   * Generate an opaque refresh token (7 days) and persist a SHA-256 hash in the DB.
   * Returns the plain-text token to be sent to the client.
   */
  async generateRefreshToken(user: User, options: RefreshTokenOptions = {}): Promise<string> {
    const rawToken = uuidv4();
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiryDays = parseInt(process.env.JWT_REFRESH_TOKEN_EXPIRES_DAYS || '7', 10);
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

    await strapi.db.query('api::refresh-token.refresh-token').create({
      data: {
        token_hash: tokenHash,
        user: user.id,
        device_type: options.deviceType,
        device_info: options.deviceInfo,
        ip_address: options.ipAddress,
        expires_at: expiresAt,
        last_used_at: new Date(),
        revoked: false,
      },
    });

    return rawToken;
  },

  /**
   * Validate a raw refresh token by looking up its SHA-256 hash in the DB.
   */
  async validateRefreshToken(rawToken: string) {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const record = await strapi.db.query('api::refresh-token.refresh-token').findOne({
      where: { token_hash: tokenHash },
      populate: ['user'],
    });

    if (!record) {
      return null;
    }

    if (record.revoked) {
      return null;
    }

    if (new Date() > new Date(record.expires_at)) {
      return null;
    }

    return record;
  },

  /**
   * Revoke a refresh token by its hash.
   */
  async revokeRefreshToken(rawToken: string, reason: string = 'logout'): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    await strapi.db.query('api::refresh-token.refresh-token').updateMany({
      where: { token_hash: tokenHash },
      data: {
        revoked: true,
        revoked_at: new Date(),
        revoked_reason: reason,
      },
    });
  },

  /**
   * Revoke all active refresh tokens for a user (logout from all devices).
   */
  async revokeAllUserRefreshTokens(userId: number | string): Promise<void> {
    await strapi.db.query('api::refresh-token.refresh-token').updateMany({
      where: { user: userId, revoked: false },
      data: {
        revoked: true,
        revoked_at: new Date(),
        revoked_reason: 'logout',
      },
    });
  },

  /**
   * Update last_used_at and optionally rotate the refresh token per ADR-002.
   */
  async rotateRefreshToken(
    oldRawToken: string,
    user: User,
    options: RefreshTokenOptions = {}
  ): Promise<string> {
    await this.revokeRefreshToken(oldRawToken, 'rotated');
    return this.generateRefreshToken(user, options);
  },

  /**
   * Build the sanitized user object for API responses.
   */
  buildUserResponse(user: any) {
    return {
      id: user.id,
      email: user.email,
      displayName: user.display_name || user.username,
      username: user.username,
      role: user.role?.type || user.role?.name || 'reader',
      authProvider: user.auth_provider,
      avatarUrl: user.avatar_url,
      bio: user.bio,
      confirmed: user.confirmed,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  },
});

export default tokenService;
