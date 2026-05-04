import { config } from './config'
import { buildServer } from './server'

async function main() {
  const fastify = await buildServer()
  await fastify.listen({ port: config.PORT, host: config.HOST })
  fastify.log.info(`PharmaBridge API → http://${config.HOST}:${config.PORT}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
