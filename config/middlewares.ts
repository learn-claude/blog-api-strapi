export default ({ env }) => [
  'strapi::logger',
  'strapi::errors',
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'connect-src': ["'self'", 'https:'],
          'img-src': ["'self'", 'data:', 'blob:', 'market-assets.strapi.io'],
          'media-src': ["'self'", 'data:', 'blob:'],
          upgradeInsecureRequests: null,
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
      },
      frameguard: {
        action: 'deny',
      },
    },
  },
  {
    name: 'strapi::cors',
    config: {
      origin: env.array('CORS_ORIGIN', ['http://localhost:3000', 'http://localhost:1337']),
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
      headers: ['Content-Type', 'Authorization', 'Origin', 'Accept', 'X-Requested-With'],
      exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
      keepHeaderOnError: true,
      credentials: true,
    },
  },
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];
