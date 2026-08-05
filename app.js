'use strict'

import express from 'express'
import bodyParser from 'body-parser'
import AsyncEventEmitter from 'events-async'

import logger from './lib/logger.js'
import requestLogger from './lib/request-logger.js'
import authMiddleware from './lib/auth-middleware.js'
import githubEvents from './lib/github-events.js'
import jenkinsEvents from './lib/jenkins-events.js'

const captureRaw = (req, res, buffer) => { req.raw = buffer }

export const app = express()
export const events = new AsyncEventEmitter()

const logsDir = process.env.LOGS_DIR || ''

app.use(bodyParser.json({ verify: captureRaw }))

if (logsDir) {
  app.use('/logs', authMiddleware, express.static(logsDir))
}

// Give each request a unique logger and avoid logging the GitHub webhook secret.
app.use(requestLogger(logger))

githubEvents(app, events)
jenkinsEvents(app, events)

app.use(function logUnhandledErrors (err, req, res, next) {
  logger.error(err, 'Unhandled error while responding to incoming HTTP request')
  res.status(500).end()
})
