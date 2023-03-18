'use strict'

const tap = require('tap')
const fetchMock = require('fetch-mock')
const supertest = require('supertest')

const { app, events } = require('../../app')

const readFixture = require('../read-fixture')

require('../../scripts/event-relay')(app, events)

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
