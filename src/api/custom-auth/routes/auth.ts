/**
 * Custom authentication routes per ADR-002 and ADR-003 API specification.
 * See: blog-docs/api-specs/authentication-api-v1.yaml
 */
export default {
  routes: [
    // ─── Provider Authentication (ADR-003) ──────────────────────────────────
    {
      method: 'POST',
      path: '/auth/apple',
      handler: 'api::custom-auth.auth.appleAuth',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
        description: 'Authenticate with Apple Sign-In',
        tags: ['Authentication'],
      },
    },
    {
      method: 'POST',
      path: '/auth/google',
      handler: 'api::custom-auth.auth.googleAuth',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
        description: 'Authenticate with Google Sign-In',
        tags: ['Authentication'],
      },
    },
    {
      method: 'POST',
      path: '/auth/email/send-otp',
      handler: 'api::custom-auth.auth.emailSendOtp',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
        description: 'Request an OTP code for email authentication',
        tags: ['Authentication'],
      },
    },
    {
      method: 'POST',
      path: '/auth/email/verify-otp',
      handler: 'api::custom-auth.auth.emailVerifyOtp',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
        description: 'Verify OTP code and issue JWT tokens',
        tags: ['Authentication'],
      },
    },

    // ─── Token Management (ADR-002) ─────────────────────────────────────────
    {
      method: 'POST',
      path: '/auth/refresh',
      handler: 'api::custom-auth.auth.refresh',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
        description: 'Refresh access token using refresh token',
        tags: ['Token Management'],
      },
    },
    {
      method: 'POST',
      path: '/auth/logout',
      handler: 'api::custom-auth.auth.logout',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
        description: 'Logout from current device (revoke refresh token)',
        tags: ['Token Management'],
      },
    },
    {
      method: 'POST',
      path: '/auth/logout-all',
      handler: 'api::custom-auth.auth.logoutAll',
      config: {
        auth: true,
        policies: [],
        middlewares: [],
        description: 'Logout from all devices',
        tags: ['Token Management'],
      },
    },

    // ─── User Profile ────────────────────────────────────────────────────────
    {
      method: 'GET',
      path: '/auth/me',
      handler: 'api::custom-auth.auth.me',
      config: {
        auth: true,
        policies: [],
        middlewares: [],
        description: 'Get current authenticated user profile',
        tags: ['User'],
      },
    },
  ],
};
