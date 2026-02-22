export default ({ env }) => {
  const emailProvider = env('EMAIL_PROVIDER', 'nodemailer');

  const emailPluginConfig =
    emailProvider === 'sendgrid'
      ? {
          // Production: SendGrid — requires @strapi/provider-email-sendgrid + SENDGRID_API_KEY
          provider: 'sendgrid',
          providerOptions: {
            apiKey: env('SENDGRID_API_KEY'),
          },
          settings: {
            defaultFrom: env('EMAIL_FROM', 'noreply@blogplatform.example.com'),
            defaultReplyTo: env('EMAIL_REPLY_TO', 'support@blogplatform.example.com'),
            defaultFromName: env('EMAIL_FROM_NAME', 'Blog Platform'),
          },
        }
      : {
          // Local dev: nodemailer — configure SMTP_HOST/USER/PASS or use Ethereal
          // OTP codes will appear in Strapi logs if SMTP is not configured
          provider: 'nodemailer',
          providerOptions: {
            host: env('SMTP_HOST', 'smtp.ethereal.email'),
            port: env.int('SMTP_PORT', 587),
            secure: false,
            auth: {
              user: env('SMTP_USER', ''),
              pass: env('SMTP_PASS', ''),
            },
          },
          settings: {
            defaultFrom: env('EMAIL_FROM', 'noreply@blogplatform.example.com'),
            defaultReplyTo: env('EMAIL_REPLY_TO', 'support@blogplatform.example.com'),
            defaultFromName: env('EMAIL_FROM_NAME', 'Blog Platform'),
          },
        };

  return {
    'users-permissions': {
      config: {
        jwt: {
          // Short-lived access token per ADR-002 (15 min)
          // Custom token generation with RS256 is in src/api/custom-auth
          expiresIn: env('JWT_ACCESS_TOKEN_EXPIRES_IN', '15m'),
        },
        jwtSecret: env('JWT_SECRET'),
        register: {
          allowedFields: ['display_name', 'bio'],
        },
      },
    },

    email: {
      config: emailPluginConfig,
    },
  };
};
