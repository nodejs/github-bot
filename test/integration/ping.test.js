import http from 'node:http'

import test from 'node:test'

import { app, events } from '../../app.js'

import ping from '../../scripts/ping.js'

ping(app, events)

test('GET /ping responds with status 200 / "pong"', (t, done) => {
  const server = app.listen()
  const port = server.address().port
  const url = `http://localhost:${port}/ping`

  t.plan(2)
  t.after(() => server.close())

  http.get(url, (res) => {
    t.assert.strictEqual(res.statusCode, 200)

    let data = ''
    res.on('data', (chunk) => {
      data += chunk
    })
    res.on('end', () => {
      t.assert.strictEqual(data, 'pong')
      done()
    })
  }).on('error', (e) => {
    t.fail(e)
  })
})
