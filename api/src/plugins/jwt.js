const fp = require('fastify-plugin');
const fjwt = require('@fastify/jwt');

module.exports = fp(async function (fastify) {
  fastify.register(fjwt, { secret: process.env.JWT_SECRET || 'geocollect-dev-secret-change-in-prod' });
  fastify.decorate('authenticate', async function (request, reply) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.code(401).send({ error: 'Unauthorized' });
    }
  });
});
