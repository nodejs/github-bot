'use strict'

const tap = require('tap')
const url = require('url')
const nock = require('nock')
const supertest = require('supertest')
const proxyquire = require('proxyquire')
const lolex = require('lolex')

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

setupNoRequestMatchHandler()

tap.test('Sends POST request to https://api.github.com/repos/nodejs/node/issues/<PR-NUMBER>/labels', (t) => {
  const clock = lolex.install()
  const expectedLabels = ['timers']
  const webhookPayload = readFixture('pull-request-opened.json')

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
  t.tearDown(() => filesScope.done() && existingRepoLabelsScope.done() && newLabelsScope.done() && clock.uninstall())

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

tap.test('Adds v6.x label when PR is targeting the v6.x-staging branch', (t) => {
  const clock = lolex.install()
  const expectedLabels = ['timers', 'v6.x']
  const webhookPayload = readFixture('pull-request-opened-v6.x.json')

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
  t.tearDown(() => filesScope.done() && existingRepoLabelsScope.done() && newLabelsScope.done() && clock.uninstall())

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

// reported bug: https://github.com/nodejs/github-bot/issues/58
tap.test('Does not create labels which does not already exist', (t) => {
  const clock = lolex.install()
  const webhookPayload = readFixture('pull-request-opened-mapproxy.json')

  const filesScope = nock('https://api.github.com')
    .filteringPath(ignoreQueryParams)
    .get('/repos/nodejs/node/pulls/7972/files')
    .reply(200, readFixture('pull-request-files-mapproxy.json'))

  const existingRepoLabelsScope = nock('https://api.github.com')
    .filteringPath(ignoreQueryParams)
    .get('/repos/nodejs/node/labels')
    .reply(200, readFixture('repo-labels.json'))

  t.plan(1)
  t.tearDown(() => filesScope.done() && existingRepoLabelsScope.done() && clock.uninstall())

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

// reported bug: https://github.com/nodejs/github-bot/issues/92
tap.test('Adds V8 Engine label when PR has deps/v8 file changes', (t) => {
  const clock = lolex.install()
  const expectedLabels = ['V8 Engine']
  const webhookPayload = readFixture('pull-request-opened-v8.json')

  const filesScope = nock('https://api.github.com')
    .filteringPath(ignoreQueryParams)
    .get('/repos/nodejs/node/pulls/9422/files')
    .reply(200, readFixture('pull-request-files-v8.json'))

  const existingRepoLabelsScope = nock('https://api.github.com')
    .filteringPath(ignoreQueryParams)
    .get('/repos/nodejs/node/labels')
    .reply(200, readFixture('repo-labels.json'))

  const newLabelsScope = nock('https://api.github.com')
    .filteringPath(ignoreQueryParams)
    .post('/repos/nodejs/node/issues/9422/labels', expectedLabels)
    .reply(200)

  t.plan(1)
  t.tearDown(() => filesScope.done() && existingRepoLabelsScope.done() && newLabelsScope.done() && clock.uninstall())

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

function ignoreQueryParams (pathAndQuery) {
  return url.parse(pathAndQuery, true).pathname
}

// nock doesn't make the tests explode if an unexpected external request is made,
// we therefore have to attach an explicit "no match" handler too make tests fail
// if there's made outgoing request we didn't expect
function setupNoRequestMatchHandler () {
  nock.emitter.on('no match', (req) => {
    // requests against the app is expected and we shouldn't need to tell nock about it
    if (req.hostname === '127.0.0.1') return

    const reqUrl = `${req._headers.host}${req.path}`
    throw new Error(`Unexpected request was sent to ${reqUrl}`)
  })
}
