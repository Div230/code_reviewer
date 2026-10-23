import { createApp } from './app.js'
import { connectDatabase, disconnectDatabase } from './config/database.js'
import { env } from './config/env.js'
import { logger } from './utils/logger.js'

const app = createApp()

async function main() {
  await connectDatabase()
  const server = app.listen(env.PORT, () => {
    logger.info('server.started', { port: env.PORT })
  })

  const shutdown = async () => {
    logger.info('server.stopping')
    server.close(async () => {
      await disconnectDatabase()
      process.exit(0)
    })
  }

  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}

void main().catch((error) => {
  logger.error('server.failed_to_start', { errorType: error instanceof Error ? error.name : 'unknown' })
  process.exit(1)
})
