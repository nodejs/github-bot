'use strict'

require('dotenv').load({ silent: true })

const path = require('path')
const glob = require('glob')
const express = require('express')
const bodyParser = require('body-parser')
const bunyanMiddleware = require('bunyan-middleware')

const logger = require('./lib/logger')
const authMiddleware = require('./lib/auth-middleware')

const captureRaw = (req, res, buffer) => { req.raw = buffer }

const app = express()

app.use(bodyParser.json({ verify: captureRaw }))
app.use('/logs', authMiddleware, express.static(path.join(__dirname, 'logs')))
// bunyanMiddleware gives us request id's and unique loggers per incoming request,
// for satefy reasons we don't want to include the webhook GitHub secret in logs
app.use(bunyanMiddleware({ logger, obscureHeaders: ['x-hub-signature'] }))

require('./lib/github-events')(app)

// load all the files in the scripts folder
glob.sync(process.argv[2] || './scripts/**/*.js').forEach((file) => {
  logger.info('Loading:', file)
  require(file)(app)
})

module.exports = app
