import test from 'node:test'
import fetchMock from 'fetch-mock'
import supertest from 'supertest'

import { app, events } from '../../app.js'

import readFixture from '../read-fixture.js'

import eventRelay from '../../scripts/event-relay.js'

eventRelay(app, events)

test('Sends POST requests to https://api.github.com/repos/nodejs/<repo>/dispatches', (t, done) => {
  const jenkinsPayload = readFixture('success-payload.json')

  fetchMock.mockGlobal()
  fetchMock.route('https://api.github.com/repos/nodejs/node/dispatches', 204)

  t.plan(2)

  supertest(app)
    .post('/node/jenkins/start')
    .send(jenkinsPayload)
    .expect(200)
    .end((err, res) => {
      t.assert.strictEqual(err, null)
      t.assert.strictEqual(fetchMock.callHistory.called(), true)
      done()
    })
})
