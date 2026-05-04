import type { FastifyPluginAsync } from 'fastify'
import { success } from '../utils/response'

const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/health', async (_request, reply) => {
    return reply.send(
      success({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version ?? '0.0.1',
      })
    )
  })
}

export default healthRoutes
