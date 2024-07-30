import 'dotenv/config'

import { globSync } from 'glob'
import logger from './lib/logger.js'
import { app, events } from './app.js'

const port = process.env.PORT || 3000
const scriptsToLoad = process.env.SCRIPTS || './scripts/**/*.js'

// load all the files in the scripts folder
const files = globSync(scriptsToLoad, { dotRelative: true })
for (const file of files) {
  logger.info('Loading:', file)
  const { default: extend } = await import(file)
  extend(app, events)
}

app.listen(port, () => {
  logger.info('Listening on port', port)
})

// may open up an SSE relay channel helpful for local debugging
// of github repository events, wo/having to deploy changes
if (process.env.SSE_RELAY) {
  const EventSource = require('eventsource')
  const es = new EventSource(process.env.SSE_RELAY)
  es.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data)
      if (!data.action) return

      app.emitGhEvent(data, logger)
    } catch (e) {
      logger.error('Error while receiving SSE relay message', e)
    }
  }
}

function logUnhandledException (err) {
  logger.fatal(err, 'Unchaught exception, terminating bot process immediately')

  // leave time for error to be written to disk before exiting process
  setTimeout(() => process.exit(1), 10)
}

process.on('uncaughtException', logUnhandledException)
process.on('unhandledRejection', logUnhandledException)
