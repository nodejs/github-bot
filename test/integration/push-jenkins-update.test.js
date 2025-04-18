import test from 'node:test'
import fetchMock from 'fetch-mock'
import supertest from 'supertest'

import { app, events } from '../../app.js'

import readFixture from '../read-fixture.js'

import jenkinsStatus from '../../scripts/jenkins-status.js'

fetchMock.config.overwriteRoutes = true
fetchMock.mockGlobal()

jenkinsStatus(app, events)

test('Sends POST requests to https://api.github.com/repos/nodejs/node/statuses/<SHA>', (t, done) => {
  const jenkinsPayload = readFixture('success-payload.json')

  const listCommitsUrl = setupListCommitsMock('node')

  const url = 'https://api.github.com/repos/nodejs/node/statuses/8a5fec2a6bade91e544a30314d7cf21f8a200de1'
  fetchMock.route({ url, method: 'POST' }, 201)

  t.plan(3)

  supertest(app)
    .post('/node/jenkins/start')
    .send(jenkinsPayload)
    .expect(200)
    .end((err, res) => {
      t.assert.strictEqual(err, null)
      t.assert.strictEqual(fetchMock.callHistory.called(url), true)
      t.assert.strictEqual(fetchMock.callHistory.called(listCommitsUrl), true)
      done()
    })
})

test('Allows repository name to be provided with URL parameter when pushing job started', (t, done) => {
  const jenkinsPayload = readFixture('pending-payload.json')

  const listCommitsUrl = setupListCommitsMock('citgm')

  const url = 'https://api.github.com/repos/nodejs/citgm/statuses/8a5fec2a6bade91e544a30314d7cf21f8a200de1'
  fetchMock.route({ url, method: 'POST' }, 201)

  t.plan(3)

  supertest(app)
    .post('/citgm/jenkins/start')
    .send(jenkinsPayload)
    .expect(200)
    .end((err, res) => {
      t.assert.strictEqual(err, null)
      t.assert.strictEqual(fetchMock.callHistory.called(url), true)
      t.assert.strictEqual(fetchMock.callHistory.called(listCommitsUrl), true)
      done()
    })
})

test('Allows repository name to be provided with URL parameter when pushing job ended', (t, done) => {
  const jenkinsPayload = readFixture('success-payload.json')

  const listCommitsUrl = setupListCommitsMock('citgm')

  const url = 'https://api.github.com/repos/nodejs/citgm/statuses/8a5fec2a6bade91e544a30314d7cf21f8a200de1'
  fetchMock.route({ url, method: 'POST' }, 201)

  t.plan(3)

  supertest(app)
    .post('/citgm/jenkins/end')
    .send(jenkinsPayload)
    .expect(200)
    .end((err, res) => {
      t.assert.strictEqual(err, null)
      t.assert.strictEqual(fetchMock.callHistory.called(url), true)
      t.assert.strictEqual(fetchMock.callHistory.called(listCommitsUrl), true)
      done()
    })
})

test('Forwards payload provided in incoming POST to GitHub status API', (t, done) => {
  const fixture = readFixture('success-payload.json')

  const listCommitsUrl = setupListCommitsMock('node')

  const url = 'https://api.github.com/repos/nodejs/node/statuses/8a5fec2a6bade91e544a30314d7cf21f8a200de1'
  const body = {
    state: 'success',
    context: 'test/osx',
    description: 'tests passed',
    target_url: 'https://ci.nodejs.org/job/node-test-commit-osx/3157/'
  }
  fetchMock.route({ url, method: 'POST', body }, 201)

  t.plan(3)

  supertest(app)
    .post('/node/jenkins/start')
    .send(fixture)
    .expect(200)
    .end((err, res) => {
      t.assert.strictEqual(err, null)
      t.assert.strictEqual(fetchMock.callHistory.called(url), true)
      t.assert.strictEqual(fetchMock.callHistory.called(listCommitsUrl), true)
      done()
    })
})

test('Posts a CI comment in the related PR when Jenkins build is named node-test-pull-request', (t, done) => {
  const fixture = readFixture('jenkins-test-pull-request-success-payload.json')

  const url = 'https://api.github.com/repos/nodejs/node/issues/12345/comments'
  const body = { body: 'CI: https://ci.nodejs.org/job/node-test-pull-request/21633/' }
  fetchMock.route({ url, method: 'POST', body }, 200)

  // we don't care about asserting the scopes below, just want to stop the requests from actually being sent
  setupListCommitsMock('node')
  fetchMock.route(
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
      t.assert.strictEqual(fetchMock.callHistory.called(url), true)
      t.assert.strictEqual(err, null)
      done()
    })
})

test('Posts a CI comment in the related PR when Jenkins build is named node-test-pull-request-lite-pipeline', (t, done) => {
  const fixture = readFixture('jenkins-test-pull-request-success-payload.json')
  fixture.identifier = 'node-test-pull-request-lite-pipeline'

  const url = 'https://api.github.com/repos/nodejs/node/issues/12345/comments'
  const body = { body: 'Lite-CI: https://ci.nodejs.org/job/node-test-pull-request/21633/' }
  fetchMock.route({ url, body, method: 'POST' }, 200)

  // we don't care about asserting the scopes below, just want to stop the requests from actually being sent
  setupListCommitsMock('node')
  fetchMock.route(
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
      t.assert.strictEqual(fetchMock.callHistory.called(url), true)
      t.assert.strictEqual(err, null)
      done()
    })
})

test('Responds with 400 / "Bad request" when incoming request has invalid payload', (t, done) => {
  const fixture = readFixture('invalid-payload.json')

  // don't care about the results, just want to prevent any HTTP request ever being made
  fetchMock.route('https://api.github.com', 200)

  t.plan(1)

  supertest(app)
    .post('/node/jenkins/start')
    .send(fixture)
    .expect(400, 'Invalid payload')
    .end((err, res) => {
      t.assert.strictEqual(err, null)
      done()
    })
})

test('Responds with 400 / "Bad request" when build started status update is not related to a pull request', (t, done) => {
  const fixture = readFixture('jenkins-staging-failure-payload.json')

  // don't care about the results, just want to prevent any HTTP request ever being made
  fetchMock.route('https://api.github.com', 200)

  t.plan(1)

  supertest(app)
    .post('/node/jenkins/start')
    .send(fixture)
    .expect(400, 'Will only push builds related to pull requests')
    .end((err, res) => {
      t.assert.strictEqual(err, null)
      done()
    })
})

test('Responds with 400 / "Bad request" when build ended status update is not related to a pull request', (t, done) => {
  const fixture = readFixture('jenkins-staging-failure-payload.json')

  // don't care about the results, just want to prevent any HTTP request ever being made
  fetchMock.route('https://api.github.com/', 200)

  t.plan(1)

  supertest(app)
    .post('/node/jenkins/end')
    .send(fixture)
    .expect(400, 'Will only push builds related to pull requests')
    .end((err, res) => {
      t.assert.strictEqual(err, null)
      done()
    })
})

test('Responds with 400 / "Bad request" when incoming providing invalid repository name', (t, done) => {
  const fixture = readFixture('pending-payload.json')

  // don't care about the results, just want to prevent any HTTP request ever being made
  fetchMock.route('https://api.github.com/', 200)

  t.plan(1)

  supertest(app)
    .post('/not-valid-repo-name/jenkins/start')
    .send(fixture)
    .expect(400, 'Invalid repository')
    .end((err, res) => {
      t.assert.strictEqual(err, null)
      done()
    })
})

function setupListCommitsMock (repoName) {
  const commitsResponse = readFixture('pr-commits.json')
  const url = `https://api.github.com/repos/nodejs/${repoName}/pulls/12345/commits`

  fetchMock.route(url, commitsResponse)
  return url
}
