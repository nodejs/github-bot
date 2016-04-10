'use strict'

require('dotenv').load({ silent: true })

const glob = require('glob')
const express = require('express')
const bodyParser = require('body-parser')
const captureRaw = (req, res, buffer) => { req.raw = buffer }

const app = express()
app.use(bodyParser.json({ verify: captureRaw }))
require('./lib/github-events.js')(app)

// load all the files in the scripts folder
glob.sync(process.argv[2] || './scripts/**/*.js').forEach((file) => {
  console.log('loading:', file)
  require(file)(app)
})

const port = process.env.PORT || 3000
app.listen(port, () => {
  console.log('Example app listening on port', port)
})

if (process.env.SSE_RELAY) {
  const EventSource = require('eventsource')
  var es = new EventSource(process.env.SSE_RELAY)
  es.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data)
      if (!data.action) return

      var source = data.repository ? data.repository.full_name : data.organization.login
      console.log('event@%s: %s', source, data.action)

      app.emit(data.action, data)
    } catch (e) {
      console.error(e)
    }
  }
}
