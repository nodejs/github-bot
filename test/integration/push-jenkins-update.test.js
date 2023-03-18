'use strict'

const tap = require('tap')
const fetchMock = require('fetch-mock')
fetchMock.config.overwriteRoutes = true

const supertest = require('supertest')

const { app, events } = require('../../app')

const readFixture = require('../read-fixture')

require('../../scripts/jenkins-status')(app, events)

tap.test('Sends POST requests to https://api.github.com/repos/nodejs/node/statuses/<SHA>', (t) => {
  const jenkinsPayload = readFixture('success-payload.json')

  const listCommitsUrl = setupListCommitsMock('node')

  const url = 'https://api.github.com/repos/nodejs/node/statuses/8a5fec2a6bade91e544a30314d7cf21f8a200de1'
  fetchMock.mock({ url, method: 'POST' }, 201)

  t.plan(3)

  supertest(app)
    .post('/node/jenkins/start')
    .send(jenkinsPayload)
    .expect(200)
    .end((err, res) => {
      t.equal(err, null)
      t.equal(fetchMock.done(url), true)
      t.equal(fetchMock.done(listCommitsUrl), true)
    })
})

tap.test('Allows repository name to be provided with URL parameter when pushing job started', (t) => {
  const jenkinsPayload = readFixture('pending-payload.json')

  const listCommitsUrl = setupListCommitsMock('citgm')

  const url = 'https://api.github.com/repos/nodejs/citgm/statuses/8a5fec2a6bade91e544a30314d7cf21f8a200de1'
  fetchMock.mock({ url, method: 'POST' }, 201)

  t.plan(3)

  supertest(app)
    .post('/citgm/jenkins/start')
    .send(jenkinsPayload)
    .expect(200)
    .end((err, res) => {
      t.equal(err, null)
      t.equal(fetchMock.done(url), true)
      t.equal(fetchMock.done(listCommitsUrl), true)
    })
})

tap.test('Allows repository name to be provided with URL parameter when pushing job ended', (t) => {
  const jenkinsPayload = readFixture('success-payload.json')

  const listCommitsUrl = setupListCommitsMock('citgm')

  const url = 'https://api.github.com/repos/nodejs/citgm/statuses/8a5fec2a6bade91e544a30314d7cf21f8a200de1'
  fetchMock.mock({ url, method: 'POST' }, 201)

  t.plan(3)

  supertest(app)
    .post('/citgm/jenkins/end')
    .send(jenkinsPayload)
    .expect(200)
    .end((err, res) => {
      t.equal(err, null)
      t.equal(fetchMock.done(url), true)
      t.equal(fetchMock.done(listCommitsUrl), true)
    })
})

tap.test('Forwards payload provided in incoming POST to GitHub status API', (t) => {
  const fixture = readFixture('success-payload.json')

  const listCommitsUrl = setupListCommitsMock('node')

  const url = 'https://api.github.com/repos/nodejs/node/statuses/8a5fec2a6bade91e544a30314d7cf21f8a200de1'
  const body = {
    state: 'success',
    context: 'test/osx',
    description: 'tests passed',
    target_url: 'https://ci.nodejs.org/job/node-test-commit-osx/3157/'
  }
  fetchMock.mock({ url, method: 'POST', body }, 201)

  t.plan(3)

  supertest(app)
    .post('/node/jenkins/start')
    .send(fixture)
    .expect(200)
    .end((err, res) => {
      t.equal(err, null)
      t.equal(fetchMock.done(url), true)
      t.equal(fetchMock.done(listCommitsUrl), true)
    })
})

tap.test('Posts a CI comment in the related PR when Jenkins build is named node-test-pull-request', (t) => {
  const fixture = readFixture('jenkins-test-pull-request-success-payload.json')

  const url = 'https://api.github.com/repos/nodejs/node/issues/12345/comments'
  const body = { body: 'CI: https://ci.nodejs.org/job/node-test-pull-request/21633/' }
  fetchMock.mock({ url, method: 'POST', body }, 200)

  // we don't care about asserting the scopes below, just want to stop the requests from actually being sent
  setupListCommitsMock('node')
  fetchMock.mock(
    {
      url: 'https://api.github.com/repos/nodejs/node/statuses/8a5fec2a6bade91e544a30314d7cf21f8a200de1',
      method: 'POST'
    }, 201)

  t.plan(2)

  supertest(app)
    .post('/node/jenkins/start')
    .send(fixture)
    .expect(200)
    .end((err, res) => {
      t.equal(fetchMock.done(url), true)
      t.equal(err, null)
    })
})

tap.test('Posts a CI comment in the related PR when Jenkins build is named node-test-pull-request-lite-pipeline', (t) => {
  const fixture = readFixture('jenkins-test-pull-request-success-payload.json')
  fixture.identifier = 'node-test-pull-request-lite-pipeline'

  const url = 'https://api.github.com/repos/nodejs/node/issues/12345/comments'
  const body = { body: 'Lite-CI: https://ci.nodejs.org/job/node-test-pull-request/21633/' }
  fetchMock.mock({ url, body, method: 'POST' }, 200)

  // we don't care about asserting the scopes below, just want to stop the requests from actually being sent
  setupListCommitsMock('node')
  fetchMock.mock(
    {
      url: 'https://api.github.com/repos/nodejs/node/statuses/8a5fec2a6bade91e544a30314d7cf21f8a200de1',
      method: 'POST'
    }, 201)

  t.plan(2)

  supertest(app)
    .post('/node/jenkins/start')
    .send(fixture)
    .expect(200)
    .end((err, res) => {
      t.equal(fetchMock.done(url), true)
      t.equal(err, null)
    })
})

tap.test('Responds with 400 / "Bad request" when incoming request has invalid payload', (t) => {
  const fixture = readFixture('invalid-payload.json')

  // don't care about the results, just want to prevent any HTTP request ever being made
  fetchMock.mock('https://api.github.com', 200)

  t.plan(1)

  supertest(app)
    .post('/node/jenkins/start')
    .send(fixture)
    .expect(400, 'Invalid payload')
    .end((err, res) => {
      t.equal(err, null)
    })
})

tap.test('Responds with 400 / "Bad request" when build started status update is not related to a pull request', (t) => {
  const fixture = readFixture('jenkins-staging-failure-payload.json')

  // don't care about the results, just want to prevent any HTTP request ever being made
  fetchMock.mock('https://api.github.com', 200)

  t.plan(1)

  supertest(app)
    .post('/node/jenkins/start')
    .send(fixture)
    .expect(400, 'Will only push builds related to pull requests')
    .end((err, res) => {
      t.equal(err, null)
    })
})

tap.test('Responds with 400 / "Bad request" when build ended status update is not related to a pull request', (t) => {
  const fixture = readFixture('jenkins-staging-failure-payload.json')

  // don't care about the results, just want to prevent any HTTP request ever being made
  fetchMock.mock('https://api.github.com/', 200)

  t.plan(1)

  supertest(app)
    .post('/node/jenkins/end')
    .send(fixture)
    .expect(400, 'Will only push builds related to pull requests')
    .end((err, res) => {
      t.equal(err, null)
    })
})

tap.test('Responds with 400 / "Bad request" when incoming providing invalid repository name', (t) => {
  const fixture = readFixture('pending-payload.json')

  // don't care about the results, just want to prevent any HTTP request ever being made
  fetchMock.mock('https://api.github.com/', 200)

  t.plan(1)

  supertest(app)
    .post('/not-valid-repo-name/jenkins/start')
    .send(fixture)
    .expect(400, 'Invalid repository')
    .end((err, res) => {
      t.equal(err, null)
    })
})

function setupListCommitsMock (repoName) {
  const commitsResponse = readFixture('pr-commits.json')
  const url = `https://api.github.com/repos/nodejs/${repoName}/pulls/12345/commits`

  fetchMock.mock(url, commitsResponse)
  return url
}
