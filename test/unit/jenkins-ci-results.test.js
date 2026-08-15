import test from 'node:test'
import fetchMock from 'fetch-mock'

import { extractBuildNumber, postBuildResults } from '../../lib/jenkins-ci-results.js'

import readFixture from '../read-fixture.js'

fetchMock.config.overwriteRoutes = true
fetchMock.mockGlobal()

const originalCredentials = process.env.JENKINS_API_CREDENTIALS

function restoreCredentials () {
  if (originalCredentials === undefined) {
    delete process.env.JENKINS_API_CREDENTIALS
  } else {
    process.env.JENKINS_API_CREDENTIALS = originalCredentials
  }
}

function createLoggerStub () {
  const logger = {
    child: () => logger,
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {}
  }
  return logger
}

test('extractBuildNumber: finds the build number in the build URL', (t) => {
  const build = readFixture('jenkins-test-pull-request-success-payload.json')

  t.assert.strictEqual(extractBuildNumber(build), 21633)
})

test('extractBuildNumber: returns null when build URL is not a node-test-pull-request job', (t) => {
  const build = readFixture('success-payload.json')

  t.assert.strictEqual(extractBuildNumber(build), null)
})

test('postBuildResults: posts CI results comment in the related PR', async (t) => {
  process.env.JENKINS_API_CREDENTIALS = 'bot:secret-token'
  t.after(restoreCredentials)

  const build = readFixture('jenkins-test-pull-request-success-payload.json')
  build.status = 'success'

  const markdown = 'Job https://ci.nodejs.org/job/node-test-pull-request/21633/ is green.'
  const url = 'https://api.github.com/repos/nodejs/node/issues/12345/comments'
  fetchMock.route({ url, method: 'POST', body: { body: markdown } }, 200)

  let fetchedBuildNumber = null

  t.plan(2)

  await postBuildResults(
    { owner: 'nodejs', repo: 'node', pr: 12345, logger: createLoggerStub() },
    build,
    async (buildNumber) => {
      fetchedBuildNumber = buildNumber
      return markdown
    }
  )

  t.assert.strictEqual(fetchedBuildNumber, 21633)
  t.assert.strictEqual(fetchMock.callHistory.called(url), true)
})

test('postBuildResults: does nothing when JENKINS_API_CREDENTIALS is not set', async (t) => {
  delete process.env.JENKINS_API_CREDENTIALS
  t.after(restoreCredentials)

  const build = readFixture('jenkins-test-pull-request-success-payload.json')
  build.status = 'success'

  let fetchResultsCalled = false

  t.plan(1)

  await postBuildResults(
    { owner: 'nodejs', repo: 'node', pr: 12345, logger: createLoggerStub() },
    build,
    async () => {
      fetchResultsCalled = true
      return ''
    }
  )

  t.assert.strictEqual(fetchResultsCalled, false)
})

test('postBuildResults: does nothing when build number cannot be found in build URL', async (t) => {
  process.env.JENKINS_API_CREDENTIALS = 'bot:secret-token'
  t.after(restoreCredentials)

  const build = readFixture('jenkins-test-pull-request-success-payload.json')
  build.url = 'https://ci.nodejs.org/job/node-test-pull-request/'

  let fetchResultsCalled = false

  t.plan(1)

  await postBuildResults(
    { owner: 'nodejs', repo: 'node', pr: 12345, logger: createLoggerStub() },
    build,
    async () => {
      fetchResultsCalled = true
      return ''
    }
  )

  t.assert.strictEqual(fetchResultsCalled, false)
})

test('postBuildResults: does not post a comment when no results markdown was produced', async (t) => {
  process.env.JENKINS_API_CREDENTIALS = 'bot:secret-token'
  t.after(restoreCredentials)

  const build = readFixture('jenkins-test-pull-request-success-payload.json')
  build.status = 'failure'

  fetchMock.clearHistory()

  t.plan(1)

  await postBuildResults(
    { owner: 'nodejs', repo: 'node', pr: 12345, logger: createLoggerStub() },
    build,
    async () => ''
  )

  const url = 'https://api.github.com/repos/nodejs/node/issues/12345/comments'
  t.assert.strictEqual(fetchMock.callHistory.called(url), false)
})
