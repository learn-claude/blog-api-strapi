import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::blog-post.blog-post', ({ strapi }) => ({
  async find(ctx) {
    const { data, meta } = await super.find(ctx);
    return { data, meta };
  },

  async findOne(ctx) {
    const { id } = ctx.params;
    const { data, meta } = await super.findOne(ctx);

    if (data) {
      await strapi.db.query('api::blog-post.blog-post').update({
        where: { id },
        data: { view_count: { increment: 1 } },
      });
    }

    return { data, meta };
  },

  async create(ctx) {
    const { id: userId } = ctx.state.user;
    ctx.request.body.data = {
      ...ctx.request.body.data,
      author: userId,
    };
    return super.create(ctx);
  },
}));
