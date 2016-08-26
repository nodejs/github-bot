'use strict'

const tap = require('tap')
const request = require('request')

const app = require('../../app')

tap.test('GET /ping responds with status 200 / "pong"', (t) => {
  const server = app.listen()
  const port = server.address().port
  const url = `http://localhost:${port}/ping`

  t.plan(3)
  t.tearDown(() => server.close())

  request(url, (err, res, body) => {
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.equal(res.body, 'pong')
  })
})
