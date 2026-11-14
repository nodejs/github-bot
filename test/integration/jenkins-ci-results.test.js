import test from 'node:test'
import fetchMock from 'fetch-mock'
import supertest from 'supertest'
import { MockAgent, setGlobalDispatcher } from 'undici'

import { app, events } from '../../app.js'

import readFixture from '../read-fixture.js'

import jenkinsStatus from '../../scripts/jenkins-status.js'

// the GitHub client uses the global fetch, while node-core-utils performs its
// Jenkins API calls with undici's fetch, so the two are mocked separately
fetchMock.config.overwriteRoutes = true
fetchMock.mockGlobal()

const mockAgent = new MockAgent()
mockAgent.disableNetConnect()
setGlobalDispatcher(mockAgent)

process.env.JENKINS_WORKER_IPS = '127.0.0.1'
process.env.JENKINS_API_CREDENTIALS = 'bot:test-token'

jenkinsStatus(app, events)

const commentUrl = 'https://api.github.com/repos/nodejs/node/issues/12345/comments'

test('Posts a comment with the CI results when a node-test-pull-request build fails', (t, done) => {
  const jenkinsPayload = readFixture('jenkins-test-pull-request-success-payload.json')
  jenkinsPayload.status = 'failure'
  jenkinsPayload.message = 'tests failed'

  mockAgent.get('https://ci.nodejs.org')
    .intercept({ path: /^\/job\/node-test-pull-request\/21633\/api\/json/, method: 'GET' })
    .reply(200, readFixture('jenkins-ci-pr-build-failed-test.json'))
  mockAgent.get('https://ci.nodejs.org')
    .intercept({ path: /^\/job\/node-test-commit-linux-containered\/30001\/api\/json/, method: 'GET' })
    .reply(200, readFixture('jenkins-ci-worker-failure.json'))
  mockAgent.get('https://ci.nodejs.org')
    .intercept({
      path: /^\/job\/node-test-commit-linux-containered\/30001\/nodes=ubuntu2204-64\/1\/api\/json/,
      method: 'GET'
    })
    .reply(200, readFixture('jenkins-ci-test-run.json'))
  mockAgent.get('https://ci.nodejs.org')
    .intercept({
      path: '/job/node-test-commit-linux-containered/30001/nodes=ubuntu2204-64/1/consoleText',
      method: 'GET'
    })
    .reply(200, readFixture('jenkins-ci-test-run-console.txt'))

  fetchMock.route({ url: commentUrl, method: 'POST' }, 200)

  setupPushStatusMocks()

  t.plan(4)

  supertest(app)
    .post('/node/jenkins/end')
    .send(jenkinsPayload)
    .expect(200)
    .end((err, res) => {
      t.assert.strictEqual(err, null)

      // the comment is posted after the bot has responded to Jenkins,
      // so wait for the GitHub API call instead of asserting right away
      waitFor(() => fetchMock.callHistory.called(commentUrl), (err) => {
        t.assert.strictEqual(err, null)
        const requestBody = fetchMock.callHistory.lastCall(commentUrl).options.body
        const comment = JSON.parse(requestBody).body
        t.assert.match(comment, /parallel\/test-example/)
        t.assert.match(comment, /AssertionError: expected true to equal false/)
        done()
      })
    })
})

test('Does not post a comment when a node-test-pull-request build succeeds', (t, done) => {
  const jenkinsPayload = readFixture('jenkins-test-pull-request-success-payload.json')
  jenkinsPayload.status = 'success'
  jenkinsPayload.message = 'all tests passed'

  setupPushStatusMocks()
  fetchMock.clearHistory()

  t.plan(2)

  supertest(app)
    .post('/node/jenkins/end')
    .send(jenkinsPayload)
    .expect(200)
    .end((err, res) => {
      t.assert.strictEqual(err, null)

      setTimeout(() => {
        t.assert.strictEqual(fetchMock.callHistory.called(commentUrl), false)
        done()
      }, 50)
    })
})

test('Does not post results from a build for another pull request', (t, done) => {
  const jenkinsPayload = readFixture('jenkins-test-pull-request-success-payload.json')
  jenkinsPayload.status = 'failure'

  const results = readFixture('jenkins-ci-pr-build-green.json')
  results.result = 'FAILURE'
  results.actions[0].parameters.find(parameter => parameter.name === 'PR_ID').value = '99999'

  mockAgent.get('https://ci.nodejs.org')
    .intercept({ path: /^\/job\/node-test-pull-request\/21633\/api\/json/, method: 'GET' })
    .reply(200, results)

  setupPushStatusMocks()
  fetchMock.clearHistory()

  t.plan(2)

  supertest(app)
    .post('/node/jenkins/end')
    .send(jenkinsPayload)
    .expect(200)
    .end((err, res) => {
      t.assert.strictEqual(err, null)

      setTimeout(() => {
        t.assert.strictEqual(fetchMock.callHistory.called(commentUrl), false)
        done()
      }, 50)
    })
})

test('Does not post a comment when another Jenkins build ends', (t, done) => {
  const jenkinsPayload = readFixture('success-payload.json')

  setupPushStatusMocks()
  fetchMock.clearHistory()

  t.plan(2)

  supertest(app)
    .post('/node/jenkins/end')
    .send(jenkinsPayload)
    .expect(200)
    .end((err, res) => {
      t.assert.strictEqual(err, null)

      setTimeout(() => {
        t.assert.strictEqual(fetchMock.callHistory.called(commentUrl), false)
        done()
      }, 50)
    })
})

// pushEnded also updates the PR commit status, which is not what is being
// tested here - these mocks just stop those requests from being sent
function setupPushStatusMocks () {
  const commitsResponse = readFixture('pr-commits.json')

  fetchMock.route('https://api.github.com/repos/nodejs/node/pulls/12345/commits', commitsResponse)
  fetchMock.route(
    {
      url: 'https://api.github.com/repos/nodejs/node/statuses/8a5fec2a6bade91e544a30314d7cf21f8a200de1',
      method: 'POST'
    }, 201)
}

function waitFor (condition, cb, timeout = 2000, interval = 10) {
  const start = Date.now()
  const timer = setInterval(() => {
    if (condition()) {
      clearInterval(timer)
      cb(null)
    } else if (Date.now() - start > timeout) {
      clearInterval(timer)
      cb(new Error(`Condition not met within ${timeout}ms`))
    }
  }, interval)
}
