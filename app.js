'use strict'

import express from 'express'
import bodyParser from 'body-parser'
import bunyanMiddleware from 'bunyan-middleware'
import AsyncEventEmitter from 'events-async'

import logger from './lib/logger.js'
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

// bunyanMiddleware gives us request id's and unique loggers per incoming request,
// for safety reasons we don't want to include the webhook GitHub secret in logs
app.use(bunyanMiddleware({
  logger,
  level: 'trace',
  obscureHeaders: ['x-hub-signature']
}))

githubEvents(app, events)
jenkinsEvents(app, events)

app.use(function logUnhandledErrors (err, req, res, next) {
  logger.error(err, 'Unhandled error while responding to incoming HTTP request')
  res.status(500).end()
})
