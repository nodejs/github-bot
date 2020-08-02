'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const bunyanMiddleware = require('bunyan-middleware')
const AsyncEventEmitter = require('events-async')

const logger = require('./lib/logger')
const authMiddleware = require('./lib/auth-middleware')

const captureRaw = (req, res, buffer) => { req.raw = buffer }

const app = express()
const events = new AsyncEventEmitter()

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

require('./lib/github-events')(app, events)
require('./lib/jenkins-events')(app, events)

app.use(function logUnhandledErrors (err, req, res, next) {
  logger.error(err, 'Unhandled error while responding to incoming HTTP request')
  res.status(500).end()
})

module.exports = { app, events }
