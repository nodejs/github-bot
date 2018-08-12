'use strict'

const tap = require('tap')
const url = require('url')
const nock = require('nock')
const lolex = require('lolex')
const supertest = require('supertest')
const proxyquire = require('proxyquire')

const testStubs = {
  './github-secret': {
    isValid: () => true,

    // necessary to make makes proxyquire return this stub
    // whenever *any* module tries to require('./github-secret')
    '@global': true
  }
}

const app = proxyquire('../../app', testStubs)
const readFixture = require('../read-fixture')

function ignoreQueryParams (pathAndQuery) {
  return url.parse(pathAndQuery, true).pathname
}

tap.test('Sends POST requests to https://api.github.com/repos/nodejs/node/statuses/<SHA>', (t) => {
  const clock = lolex.install()
  const webhookPayload = readFixture('pull-request-opened.json')

  const statusScope = nock('https://api.github.com')
                       .filteringPath(ignoreQueryParams)
                       .post('/repos/nodejs/node/statuses/aae34fdac0caea4e4aa204aeade6a12befe32e73')
                       .reply(201)

  // Necessary due to other scripts that run when "pull_request.opened" events are sent.
  const expectedLabels = ['timers']
  const filesScope = nock('https://api.github.com')
                      .filteringPath(ignoreQueryParams)
                      .get('/repos/nodejs/node/pulls/19/files')
                      .reply(200, readFixture('pull-request-files.json'))
  const existingRepoLabelsScope = nock('https://api.github.com')
                        .filteringPath(ignoreQueryParams)
                        .get('/repos/nodejs/node/labels')
                        .reply(200, readFixture('repo-labels.json'))

  const newLabelsScope = nock('https://api.github.com')
                        .filteringPath(ignoreQueryParams)
                        .post('/repos/nodejs/node/issues/19/labels', expectedLabels)
                        .reply(200)

  t.plan(1)
  t.tearDown(() => statusScope.done() && filesScope.done() && existingRepoLabelsScope.done() && newLabelsScope.done() && clock.uninstall())

  supertest(app)
    .post('/hooks/github')
    .set('x-github-event', 'pull_request')
    .send(webhookPayload)
    .expect(200)
    .end((err, res) => {
      clock.runAll()
      t.equal(err, null)
    })
})
