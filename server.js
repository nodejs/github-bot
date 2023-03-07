'use strict'

require('dotenv').config({ silent: true })

const { globSync } = require('glob')
const logger = require('./lib/logger')

const port = process.env.PORT || 3000
const scriptsToLoad = process.env.SCRIPTS || './scripts/**/*.js'
const { app, events } = require('./app')

// load all the files in the scripts folder
globSync(scriptsToLoad).forEach((file) => {
  logger.info('Loading:', file)
  require(file)(app, events)
})

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
