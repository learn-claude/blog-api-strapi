import jwt from 'jsonwebtoken';

interface AppleCredentials {
  code: string;
  platform: 'ios' | 'web';
  user?: {
    name?: { firstName?: string; lastName?: string };
    email?: string;
  };
}

interface ProviderUserInfo {
  providerId: string;
  email: string;
  name?: string;
  emailVerified: boolean;
}

/**
 * Apple Sign-In provider adapter implementing ADR-003.
 * Exchanges Apple authorization code for ID token, then extracts user info.
 */
const appleProvider = () => ({
  async validate(credentials: AppleCredentials): Promise<ProviderUserInfo> {
    const tokens = await this.exchangeCode(credentials.code, credentials.platform);
    const claims = this.decodeIdToken(tokens.id_token);

    return {
      providerId: claims.sub,
      email: claims.email,
      name: this.buildNameFromCredentials(credentials),
      emailVerified: claims.email_verified === true,
    };
  },

  async exchangeCode(code: string, platform: 'ios' | 'web') {
    const clientSecret = this.generateClientSecret();
    const clientId =
      platform === 'ios'
        ? process.env.APPLE_BUNDLE_ID
        : process.env.APPLE_SERVICES_ID;

    const params = new URLSearchParams({
      client_id: clientId || '',
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
    });

    const response = await fetch('https://appleid.apple.com/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Apple token exchange failed: ${error}`);
    }

    return response.json() as Promise<{ id_token: string; access_token: string }>;
  },

  /**
   * Generate a signed JWT as Apple's client_secret per Apple's documentation.
   * Signed with the Apple private key (ES256), valid for up to 180 days.
   */
  generateClientSecret(): string {
    const privateKey = process.env.APPLE_PRIVATE_KEY;
    const teamId = process.env.APPLE_TEAM_ID;
    const keyId = process.env.APPLE_KEY_ID;
    const servicesId = process.env.APPLE_SERVICES_ID;

    if (!privateKey || !teamId || !keyId || !servicesId) {
      throw new Error('Apple provider environment variables are not configured');
    }

    return jwt.sign({}, privateKey, {
      algorithm: 'ES256',
      expiresIn: '180d',
      audience: 'https://appleid.apple.com',
      issuer: teamId,
      subject: servicesId,
      keyid: keyId,
    });
  },

  decodeIdToken(idToken: string): any {
    // Decode without full signature verification: the token was received directly
    // from Apple's token endpoint (not from the client), so the transport is trusted.
    // TODO: For extra hardening, verify using Apple's public keys from
    //   https://appleid.apple.com/auth/keys (JWKS) before decoding claims.
    const decoded = jwt.decode(idToken);
    if (!decoded || typeof decoded !== 'object') {
      throw new Error('Invalid Apple ID token');
    }
    return decoded;
  },

  buildNameFromCredentials(credentials: AppleCredentials): string | undefined {
    const name = credentials.user?.name;
    if (!name) return undefined;
    return [name.firstName, name.lastName].filter(Boolean).join(' ') || undefined;
  },
});

export default appleProvider;
