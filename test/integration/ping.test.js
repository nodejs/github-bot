import http from 'node:http'

import tap from 'tap'

import { app, events } from '../../app.js'

import ping from '../../scripts/ping.js'

ping(app, events)

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
