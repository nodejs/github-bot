import tap from 'tap'
import fetchMock from 'fetch-mock'
import supertest from 'supertest'

import { app, events } from '../../app.js'

import readFixture from '../read-fixture.js'

import eventRelay from '../../scripts/event-relay.js'

eventRelay(app, events)

tap.test('Sends POST requests to https://api.github.com/repos/nodejs/<repo>/dispatches', (t) => {
  const jenkinsPayload = readFixture('success-payload.json')

  fetchMock.mock('https://api.github.com/repos/nodejs/node/dispatches', 204)

  t.plan(2)

  supertest(app)
    .post('/node/jenkins/start')
    .send(jenkinsPayload)
    .expect(200)
    .end((err, res) => {
      t.equal(err, null)
      t.equal(fetchMock.done(), true)
    })
})
