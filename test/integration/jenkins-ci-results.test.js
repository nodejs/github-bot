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

process.env.JENKINS_API_CREDENTIALS = 'bot:test-token'

jenkinsStatus(app, events)

const commentUrl = 'https://api.github.com/repos/nodejs/node/issues/12345/comments'

test('Posts a comment with the CI results when a node-test-pull-request build ends', (t, done) => {
  const jenkinsPayload = readFixture('jenkins-test-pull-request-success-payload.json')
  jenkinsPayload.status = 'success'
  jenkinsPayload.message = 'all tests passed'

  mockAgent.get('https://ci.nodejs.org')
    .intercept({ path: /^\/job\/node-test-pull-request\/21633\/api\/json/, method: 'GET' })
    .reply(200, readFixture('jenkins-ci-pr-build-green.json'))

  const body = { body: 'Job https://ci.nodejs.org/job/node-test-pull-request/21633/ is green.' }
  fetchMock.route({ url: commentUrl, method: 'POST', body }, 200)

  setupPushStatusMocks()

  t.plan(2)

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
        done()
      })
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
