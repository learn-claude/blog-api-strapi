export default ({ env }) => ({
  'users-permissions': {
    config: {
      jwt: {
        // Short-lived access token per ADR-002 (15 min)
        // Note: custom token generation with RS256 is handled in src/api/custom-auth
        expiresIn: env('JWT_ACCESS_TOKEN_EXPIRES_IN', '15m'),
      },
      jwtSecret: env('JWT_SECRET'),
      // Disable built-in registration and password-based auth
      // All auth goes through custom-auth API (ADR-003)
      register: {
        allowedFields: ['display_name', 'bio'],
      },
    },
  },

  email: {
    config: {
      provider: 'sendgrid',
      providerOptions: {
        apiKey: env('SENDGRID_API_KEY', ''),
      },
      settings: {
        defaultFrom: env('EMAIL_FROM', 'noreply@blogplatform.example.com'),
        defaultReplyTo: env('EMAIL_REPLY_TO', 'support@blogplatform.example.com'),
        defaultFromName: env('EMAIL_FROM_NAME', 'Blog Platform'),
      },
    },
  },
});
