import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'
import Redis from 'ioredis'
import { config } from '../config'

declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis
  }
}

const redisPlugin: FastifyPluginAsync = fp(async (fastify) => {
  const isDev = config.NODE_ENV === 'development'

  const redis = new Redis(config.REDIS_URL, {
    maxRetriesPerRequest: isDev ? 0 : 3,
    lazyConnect: true,
    enableReadyCheck: true,
    // In dev, don't hammer logs with reconnect attempts
    retryStrategy: isDev ? () => null : (times) => Math.min(times * 200, 5000),
  })

  // Suppress noisy error events in dev when Redis is simply not running
  redis.on('error', (err) => {
    if (!isDev) fastify.log.error({ err }, 'Redis error')
  })

  try {
    await redis.connect()
    fastify.log.info('Redis connected')
  } catch (err) {
    if (isDev) {
      fastify.log.warn(
        'Redis unavailable — start Redis locally (see docs/dev-databases.md). ' +
          'Features using cache/rate-limit/queues will fail until Redis is running.',
      )
    } else {
      throw err
    }
  }

  fastify.decorate('redis', redis)

  fastify.addHook('onClose', async () => {
    redis.disconnect()
  })
})

export default redisPlugin
