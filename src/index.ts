export default {
  /**
   * Register phase: runs before Strapi bootstraps.
   * Use to register custom services, policies, middlewares, etc.
   */
  register(/* { strapi } */) {},

  /**
   * Bootstrap phase: runs after Strapi has loaded all plugins/APIs.
   * Use to set up default data, permissions, etc.
   */
  async bootstrap({ strapi }) {
    // Set default permissions for the public role after first startup
    // This ensures anonymous users can read published blog posts, categories and tags
    const publicRole = await strapi
      .query('plugin::users-permissions.role')
      .findOne({ where: { type: 'public' } });

    if (publicRole) {
      const publicPermissions = [
        { action: 'api::blog-post.blog-post.find', role: publicRole.id },
        { action: 'api::blog-post.blog-post.findOne', role: publicRole.id },
        { action: 'api::category.category.find', role: publicRole.id },
        { action: 'api::category.category.findOne', role: publicRole.id },
        { action: 'api::tag.tag.find', role: publicRole.id },
        { action: 'api::tag.tag.findOne', role: publicRole.id },
        { action: 'api::custom-auth.auth.appleAuth', role: publicRole.id },
        { action: 'api::custom-auth.auth.googleAuth', role: publicRole.id },
        { action: 'api::custom-auth.auth.emailSendOtp', role: publicRole.id },
        { action: 'api::custom-auth.auth.emailVerifyOtp', role: publicRole.id },
        { action: 'api::custom-auth.auth.refresh', role: publicRole.id },
      ];

      for (const permission of publicPermissions) {
        const exists = await strapi
          .query('plugin::users-permissions.permission')
          .findOne({ where: { action: permission.action, role: permission.role } });

        if (!exists) {
          await strapi.query('plugin::users-permissions.permission').create({
            data: { action: permission.action, role: permission.role, enabled: true },
          });
        }
      }
    }
  },
};
