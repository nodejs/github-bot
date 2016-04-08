'use strict'

require('dotenv').load({ silent: true })

const express = require('express')
const bodyParser = require('body-parser')
const captureRaw = (req, res, buffer) => { req.raw = buffer }

const app = express()
app.use(bodyParser.json({ verify: captureRaw }))
require('./lib/github-events.js')(app)

// load all the files in the scripts folder
require('fs').readdirSync('./scripts').forEach((file) => {
  file = './scripts/' + file
  console.log('loading:', file)
  require(file)(app)
})

const port = process.env.PORT || 3000
app.listen(port, () => {
  console.log('Example app listening on port', port)
})
