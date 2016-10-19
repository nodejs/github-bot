'use strict'

const path = require('path')
const bunyan = require('bunyan')

const isRunningTests = process.env.npm_lifecycle_event === 'test'
const stdoutLevel = isRunningTests ? 'FATAL' : 'INFO'

const daysToKeepLogs = process.env.KEEP_LOGS || 10

module.exports = bunyan.createLogger({
  name: 'bot',
  streams: [
    {
      stream: process.stdout,
      level: stdoutLevel
    },
    {
      type: 'rotating-file',
      path: path.join(__dirname, '../logs/bot.log'),
      period: '1d', // daily rotation
      count: daysToKeepLogs,
      level: 'debug'
    }
  ]
})
