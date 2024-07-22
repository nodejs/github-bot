import path from 'node:path'

import bunyan from 'bunyan'

const isRunningTests = process.env.npm_lifecycle_event === 'test'
const stdoutLevel = isRunningTests ? 'FATAL' : process.env.LOG_LEVEL || 'INFO'

const daysToKeepLogs = process.env.KEEP_LOGS || 10
const logsDir = process.env.LOGS_DIR || ''
const rotatingFilePath = path.join(logsDir, 'bot.log')

const streams = [{
  stream: process.stdout,
  level: stdoutLevel
}]

// write to file when $LOGS_DIR is set
if (logsDir) {
  streams.push({
    type: 'rotating-file',
    path: rotatingFilePath,
    period: '1d', // daily rotation
    count: daysToKeepLogs,
    level: 'debug'
  })
}

export default bunyan.createLogger({
  name: 'bot',
  streams
})
