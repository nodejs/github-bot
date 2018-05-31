'use strict'

const tap = require('tap')
const url = require('url')
const nock = require('nock')
const supertest = require('supertest')
const proxyquire = require('proxyquire')
const lolex = require('lolex')
const readFixture = require('../read-fixture')

const app = proxyquire('../../app', {
  './github-secret': {
    isValid: () => true,

    // necessary to make makes proxyquire return this stub
    // whenever *any* module tries to require('./github-secret')
    '@global': true
  }
})

tap.test('Sends POST request to https://ci.nodejs.org', (t) => {
  const clock = lolex.install()

  const originalJobUrlValue = process.env.JENKINS_JOB_URL_NODE
  const originalTokenValue = process.env.JENKINS_BUILD_TOKEN_NODE
  process.env.JENKINS_JOB_URL_NODE = 'https://ci.nodejs.org/job/node-test-pull-request'
  process.env.JENKINS_BUILD_TOKEN_NODE = 'myToken'

  const webhookPayload = readFixture('pull-request-opened.json')

  const collaboratorsScope = nock('https://api.github.com')
                      .filteringPath(ignoreQueryParams)
                      .get('/repos/nodejs/node/collaborators/phillipj')
                      .reply(200, { permission: 'admin' })
  const ciJobScope = nock('https://ci.nodejs.org')
                        .filteringPath(ignoreQueryParams)
                        .post('/job/node-test-pull-request/build')
                        .reply(201, '', {
                          'Location': 'https://ci.nodejs.org/job/node-test-pull-request/1'
                        })

  t.plan(1)
  t.tearDown(() => collaboratorsScope.done() && ciJobScope.done() && clock.uninstall())

  supertest(app)
    .post('/hooks/github')
    .set('x-github-event', 'pull_request')
    .send(webhookPayload)
    .expect(200)
    .end((err, res) => {
      process.env.JENKINS_JOB_URL_NODE = originalJobUrlValue
      process.env.JENKINS_BUILD_TOKEN_NODE = originalTokenValue
      clock.runAll()
      t.equal(err, null)
    })
})

function ignoreQueryParams (pathAndQuery) {
  return url.parse(pathAndQuery, true).pathname
}
