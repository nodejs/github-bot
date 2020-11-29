'use strict'

const tap = require('tap')
const url = require('url')
const nock = require('nock')
const supertest = require('supertest')

const { app, events } = require('../../app')

const readFixture = require('../read-fixture')

require('../../scripts/event-relay')(app, events)

tap.test('Sends POST requests to https://api.github.com/repos/nodejs/<repo>/dispatches', (t) => {
  const jenkinsPayload = readFixture('success-payload.json')

  nock('https://api.github.com')
    .filteringPath(ignoreQueryParams)
    .post('/repos/nodejs/node/dispatches')
    .reply(204)
    .on('replied', (req, interceptor) => {
      t.doesNotThrow(() => interceptor.scope.done())
    })

  t.plan(2)

  supertest(app)
    .post('/node/jenkins/start')
    .send(jenkinsPayload)
    .expect(200)
    .end((err, res) => {
      t.equal(err, null)
    })
})

function ignoreQueryParams (pathAndQuery) {
  return url.parse(pathAndQuery, true).pathname
}
