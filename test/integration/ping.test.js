'use strict'

const http = require('http')
const tap = require('tap')

const { app, events } = require('../../app')

require('../../scripts/ping')(app, events)

tap.test('GET /ping responds with status 200 / "pong"', (t) => {
  const server = app.listen()
  const port = server.address().port
  const url = `http://localhost:${port}/ping`

  t.plan(2)
  t.teardown(() => server.close())

  http.get(url, (res) => {
    t.equal(res.statusCode, 200)

    let data = ''
    res.on('data', (chunk) => {
      data += chunk
    })
    res.on('end', () => {
      t.equal(data, 'pong')
    })
  }).on('error', (e) => {
    t.fail(e)
  })
})
