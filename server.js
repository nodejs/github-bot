'use strict'

const child_process = require('child_process')
const { checkPullRequests } = require('./lib/node-land-checks')

if (process.env.NODE_REPO_DIR) {
  const fs = require('fs')
  global._node_repo_dir = fs.realpathSync(process.env.NODE_REPO_DIR)
  const out = child_process.spawnSync('git', ['status'], { cwd: global._node_repo_dir })

  if (out.status !== 0) {
    logger.info(out.stdout)
    logger.error(out.stderr)
    logger.error('Bad NODE_REPO_DIR. Backport patch testing disabled.')
    global._node_repo_dir = false
  }
}

const app = require('./app')
const logger = require('./lib/logger')

setTimeout(checkPullRequests, 10000)

const port = process.env.PORT || 3000
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
