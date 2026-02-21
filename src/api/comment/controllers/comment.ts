import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::comment.comment', ({ strapi }) => ({
  async create(ctx) {
    const { id: userId } = ctx.state.user;
    ctx.request.body.data = {
      ...ctx.request.body.data,
      author: userId,
      is_approved: false,
    };
    return super.create(ctx);
  },

  async update(ctx) {
    const { id } = ctx.params;
    const { id: userId } = ctx.state.user;

    const comment = await strapi.db
      .query('api::comment.comment')
      .findOne({ where: { id }, populate: ['author'] });

    if (!comment) {
      return ctx.notFound('Comment not found');
    }

    const isOwner = comment.author?.id === userId;
    const userRole = ctx.state.user.role?.type;
    const isAdminOrEditor = userRole === 'admin' || userRole === 'editor';

    if (!isOwner && !isAdminOrEditor) {
      return ctx.forbidden('You do not have permission to update this comment');
    }

    return super.update(ctx);
  },

  async delete(ctx) {
    const { id } = ctx.params;
    const { id: userId } = ctx.state.user;

    const comment = await strapi.db
      .query('api::comment.comment')
      .findOne({ where: { id }, populate: ['author'] });

    if (!comment) {
      return ctx.notFound('Comment not found');
    }

    const isOwner = comment.author?.id === userId;
    const userRole = ctx.state.user.role?.type;
    const isAdminOrEditor = userRole === 'admin' || userRole === 'editor';

    if (!isOwner && !isAdminOrEditor) {
      return ctx.forbidden('You do not have permission to delete this comment');
    }

    return super.delete(ctx);
  },
}));
