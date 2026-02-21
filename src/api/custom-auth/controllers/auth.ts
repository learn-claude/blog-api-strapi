/**
 * Custom authentication controller implementing ADR-002 and ADR-003.
 *
 * Endpoints:
 *  POST /api/auth/apple          - Apple Sign-In
 *  POST /api/auth/google         - Google Sign-In
 *  POST /api/auth/email/send-otp - Request OTP for email auth
 *  POST /api/auth/email/verify-otp - Verify OTP and issue tokens
 *  POST /api/auth/refresh        - Refresh access token
 *  POST /api/auth/logout         - Revoke refresh token (current device)
 *  POST /api/auth/logout-all     - Revoke all refresh tokens (all devices)
 *  GET  /api/auth/me             - Get current user info
 */
export default {
  /**
   * Apple Sign-In (ADR-003)
   * Accepts: { code, platform, user? }
   */
  async appleAuth(ctx) {
    try {
      const { code, platform, user: appleUser } = ctx.request.body;

      if (!code || !platform) {
        return ctx.badRequest('code and platform are required');
      }

      const appleProvider = strapi.service('api::custom-auth.apple');
      const providerInfo = await appleProvider.validate({ code, platform, user: appleUser });

      const user = await findOrCreateUser(strapi, {
        email: providerInfo.email,
        authProvider: 'apple',
        providerId: providerInfo.providerId,
        displayName: providerInfo.name,
        confirmed: providerInfo.emailVerified,
      });

      return buildAuthResponse(ctx, strapi, user, platform);
    } catch (error) {
      strapi.log.error('Apple auth failed', { error: error.message, ip: ctx.request.ip });
      return ctx.unauthorized(error.message || 'Apple authentication failed');
    }
  },

  /**
   * Google Sign-In (ADR-003)
   * Accepts: { idToken, platform }
   */
  async googleAuth(ctx) {
    try {
      const { idToken, platform } = ctx.request.body;

      if (!idToken || !platform) {
        return ctx.badRequest('idToken and platform are required');
      }

      const googleProvider = strapi.service('api::custom-auth.google');
      const providerInfo = await googleProvider.validate({ idToken, platform });

      const user = await findOrCreateUser(strapi, {
        email: providerInfo.email,
        authProvider: 'google',
        providerId: providerInfo.providerId,
        displayName: providerInfo.name,
        avatarUrl: providerInfo.picture,
        confirmed: providerInfo.emailVerified,
      });

      return buildAuthResponse(ctx, strapi, user, platform);
    } catch (error) {
      strapi.log.error('Google auth failed', { error: error.message, ip: ctx.request.ip });
      return ctx.unauthorized(error.message || 'Google authentication failed');
    }
  },

  /**
   * Email OTP — request code (ADR-003)
   * Accepts: { email, agreedToTerms }
   */
  async emailSendOtp(ctx) {
    try {
      const { email, agreedToTerms } = ctx.request.body;

      if (!email) {
        return ctx.badRequest('email is required');
      }

      if (!agreedToTerms) {
        return ctx.badRequest('You must agree to the Terms of Service and Privacy Policy');
      }

      const emailProvider = strapi.service('api::custom-auth.email');

      const isRateLimited = await emailProvider.isRateLimited(email);
      if (isRateLimited) {
        ctx.set('Retry-After', '3600');
        return ctx.tooManyRequests(
          'Too many OTP requests. Please try again in 60 minutes.'
        );
      }

      const otp = await emailProvider.generateAndStore(email);

      await strapi.plugin('email').service('email').send({
        to: email,
        from: process.env.EMAIL_FROM,
        subject: 'Your Blog Platform verification code',
        text: `Your verification code is: ${otp}\n\nThis code expires in 10 minutes.`,
        html: `
          <p>Your verification code is:</p>
          <h2 style="letter-spacing:4px;font-size:32px;">${otp}</h2>
          <p>This code expires in <strong>10 minutes</strong>.</p>
          <p>If you did not request this, please ignore this email.</p>
        `,
      });

      strapi.log.info('OTP sent', { email, ip: ctx.request.ip });

      ctx.send({ message: 'Verification code sent to your email', expiresIn: 600 });
    } catch (error) {
      strapi.log.error('OTP send failed', { error: error.message });
      return ctx.internalServerError('Failed to send verification code');
    }
  },

  /**
   * Email OTP — verify code and issue tokens (ADR-003)
   * Accepts: { email, otp }
   */
  async emailVerifyOtp(ctx) {
    try {
      const { email, otp } = ctx.request.body;

      if (!email || !otp) {
        return ctx.badRequest('email and otp are required');
      }

      const emailProvider = strapi.service('api::custom-auth.email');
      const providerInfo = await emailProvider.validate({ email, otp });

      const user = await findOrCreateUser(strapi, {
        email: providerInfo.email,
        authProvider: 'email',
        providerId: providerInfo.email,
        confirmed: true,
      });

      return buildAuthResponse(ctx, strapi, user, 'email');
    } catch (error) {
      strapi.log.warn('OTP verify failed', { error: error.message, ip: ctx.request.ip });
      return ctx.unauthorized(error.message || 'OTP verification failed');
    }
  },

  /**
   * Refresh access token (ADR-002)
   * Web: reads refresh token from HTTP-only cookie
   * Mobile: reads refresh token from request body
   */
  async refresh(ctx) {
    try {
      const rawToken = ctx.cookies.get('refreshToken') || ctx.request.body?.refreshToken;

      if (!rawToken) {
        return ctx.unauthorized('No refresh token provided');
      }

      const tokenService = strapi.service('api::custom-auth.token');
      const record = await tokenService.validateRefreshToken(rawToken);

      if (!record) {
        return ctx.unauthorized('Invalid or expired refresh token');
      }

      // Load full user with role
      const user = await strapi.db
        .query('plugin::users-permissions.user')
        .findOne({ where: { id: record.user.id }, populate: ['role'] });

      if (!user) {
        return ctx.unauthorized('User not found');
      }

      const accessToken = tokenService.generateAccessToken(user);

      const shouldRotate = process.env.ROTATE_REFRESH_TOKENS === 'true';
      let newRefreshToken: string | undefined;

      if (shouldRotate) {
        newRefreshToken = await tokenService.rotateRefreshToken(
          rawToken,
          user,
          {
            deviceType: record.device_type,
            deviceInfo: record.device_info,
            ipAddress: ctx.request.ip,
          }
        );
      } else {
        // Update last_used_at without rotating
        await strapi.db.query('api::refresh-token.refresh-token').update({
          where: { id: record.id },
          data: { last_used_at: new Date() },
        });
      }

      // Set new refresh token cookie for web clients
      if (shouldRotate && newRefreshToken) {
        ctx.cookies.set('refreshToken', newRefreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000,
          path: '/api/auth',
        });
      }

      const response: Record<string, unknown> = { accessToken, expiresIn: 900 };
      if (shouldRotate && newRefreshToken) {
        response.refreshToken = newRefreshToken;
      }

      ctx.send(response);
    } catch (error) {
      strapi.log.error('Token refresh failed', { error: error.message });
      return ctx.unauthorized('Token refresh failed');
    }
  },

  /**
   * Logout — revoke refresh token for current device (ADR-002)
   * Web: reads refresh token from HTTP-only cookie
   * Mobile: reads refresh token from request body
   */
  async logout(ctx) {
    try {
      const rawToken = ctx.cookies.get('refreshToken') || ctx.request.body?.refreshToken;

      if (rawToken) {
        const tokenService = strapi.service('api::custom-auth.token');
        await tokenService.revokeRefreshToken(rawToken, 'logout');
      }

      // Clear the refresh token cookie for web clients
      ctx.cookies.set('refreshToken', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 0,
        path: '/api/auth',
      });

      ctx.send({ message: 'Logged out successfully' });
    } catch (error) {
      strapi.log.error('Logout failed', { error: error.message });
      // Still return success — local cleanup is primary (ADR-002 §9)
      ctx.send({ message: 'Logged out successfully' });
    }
  },

  /**
   * Logout from all devices — revokes all refresh tokens for the user.
   */
  async logoutAll(ctx) {
    try {
      const userId = ctx.state.user?.id;
      if (!userId) {
        return ctx.unauthorized('Authentication required');
      }

      const tokenService = strapi.service('api::custom-auth.token');
      await tokenService.revokeAllUserRefreshTokens(userId);

      ctx.cookies.set('refreshToken', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 0,
        path: '/api/auth',
      });

      ctx.send({ message: 'Logged out from all devices successfully' });
    } catch (error) {
      strapi.log.error('Logout-all failed', { error: error.message });
      return ctx.internalServerError('Logout failed');
    }
  },

  /**
   * Get current authenticated user info.
   */
  async me(ctx) {
    try {
      const userId = ctx.state.user?.id;
      if (!userId) {
        return ctx.unauthorized('Authentication required');
      }

      const user = await strapi.db
        .query('plugin::users-permissions.user')
        .findOne({ where: { id: userId }, populate: ['role'] });

      if (!user) {
        return ctx.notFound('User not found');
      }

      const tokenService = strapi.service('api::custom-auth.token');
      ctx.send(tokenService.buildUserResponse(user));
    } catch (error) {
      strapi.log.error('Get me failed', { error: error.message });
      return ctx.internalServerError('Failed to retrieve user');
    }
  },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

interface FindOrCreateUserOptions {
  email: string;
  authProvider: 'apple' | 'google' | 'email';
  providerId: string;
  displayName?: string;
  avatarUrl?: string;
  confirmed?: boolean;
}

/**
 * Find an existing user by provider+providerId or email, or create a new one.
 * Merges provider data on subsequent logins.
 */
async function findOrCreateUser(strapi: any, options: FindOrCreateUserOptions) {
  const { email, authProvider, providerId, displayName, avatarUrl, confirmed } = options;

  let user = await strapi.db.query('plugin::users-permissions.user').findOne({
    where: { auth_provider: authProvider, provider_id: providerId },
    populate: ['role'],
  });

  if (!user) {
    user = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: { email },
      populate: ['role'],
    });
  }

  const authenticatedRole = await strapi.db
    .query('plugin::users-permissions.role')
    .findOne({ where: { type: 'authenticated' } });

  if (!user) {
    const username = await generateUniqueUsername(strapi, email);
    user = await strapi.db.query('plugin::users-permissions.user').create({
      data: {
        email,
        username,
        auth_provider: authProvider,
        provider_id: providerId,
        display_name: displayName,
        avatar_url: avatarUrl,
        confirmed: confirmed ?? true,
        blocked: false,
        role: authenticatedRole?.id,
      },
      populate: ['role'],
    });
  } else {
    // Update provider data on subsequent logins
    user = await strapi.db.query('plugin::users-permissions.user').update({
      where: { id: user.id },
      data: {
        auth_provider: authProvider,
        provider_id: providerId,
        ...(displayName && !user.display_name ? { display_name: displayName } : {}),
        ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
      },
      populate: ['role'],
    });
  }

  return user;
}

async function generateUniqueUsername(strapi: any, email: string): Promise<string> {
  const base = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_');
  let username = base;
  let attempt = 0;

  while (true) {
    const exists = await strapi.db
      .query('plugin::users-permissions.user')
      .findOne({ where: { username } });

    if (!exists) {
      return username;
    }

    attempt++;
    username = `${base}_${attempt}`;
  }
}

async function buildAuthResponse(
  ctx: any,
  strapi: any,
  user: any,
  platform: string
) {
  const tokenService = strapi.service('api::custom-auth.token');

  const accessToken = tokenService.generateAccessToken(user);
  const refreshToken = await tokenService.generateRefreshToken(user, {
    deviceType: ['ios', 'android'].includes(platform) ? platform as 'ios' | 'android' : 'web',
    deviceInfo: ctx.request.headers['user-agent'],
    ipAddress: ctx.request.ip,
  });

  // Set HTTP-only cookie for web clients
  if (platform === 'web') {
    ctx.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/auth',
    });
  }

  ctx.send({
    user: tokenService.buildUserResponse(user),
    accessToken,
    refreshToken,
    expiresIn: 900,
  });
}
