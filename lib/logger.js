'use strict'

const path = require('path')
const bunyan = require('bunyan')

module.exports = bunyan.createLogger({
  name: 'bot',
  streams: [
    {
      stream: process.stdout
    },
    {
        type: 'rotating-file',
        path: path.join(__dirname, '../logs/bot.log'),
        period: '1d', // daily rotation
        count: 3      // keep three days of logging
    }
  ]
});