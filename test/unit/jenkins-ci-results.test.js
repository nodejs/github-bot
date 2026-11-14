import test from 'node:test'
import fetchMock from 'fetch-mock'
import { MockAgent, setGlobalDispatcher } from 'undici'

import {
  extractBuildNumber,
  fetchResultsMarkdown,
  limitResultsMarkdown,
  postBuildResults,
  throwOnTopLevelRetrievalFailure,
  validateBuildDestination
} from '../../lib/jenkins-ci-results.js'

import readFixture from '../read-fixture.js'

fetchMock.config.overwriteRoutes = true
fetchMock.mockGlobal()

const mockAgent = new MockAgent()
mockAgent.disableNetConnect()
setGlobalDispatcher(mockAgent)

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

test('fetchResultsMarkdown: rejects when Jenkins results cannot be retrieved', async (t) => {
  process.env.JENKINS_API_CREDENTIALS = 'bot:invalid-token'
  t.after(restoreCredentials)

  mockAgent.get('https://ci.nodejs.org')
    .intercept({ path: /^\/job\/node-test-pull-request\/21634\/api\/json/, method: 'GET' })
    .reply(401, 'Unauthorized')

  await t.assert.rejects(
    fetchResultsMarkdown(21634),
    /Unable to retrieve Jenkins CI results/
  )
})

test('throwOnTopLevelRetrievalFailure: preserves partial downstream results', () => {
  throwOnTopLevelRetrievalFailure({
    failures: [
      { type: 'JS_TEST_FAILURE', reason: 'test failed' },
      { type: 'NCU_FAILURE', reason: 'one platform was unavailable' }
    ]
  })
})

test('throwOnTopLevelRetrievalFailure: rejects a top-level retrieval failure', (t) => {
  t.assert.throws(() => throwOnTopLevelRetrievalFailure([
    { type: 'NCU_FAILURE', reason: 'Jenkins was unavailable' }
  ]), /Jenkins was unavailable/)
})

test('validateBuildDestination: accepts matching build parameters', () => {
  validateBuildDestination({
    TARGET_GITHUB_ORG: 'nodejs',
    TARGET_REPO_NAME: 'node',
    PR_ID: '12345'
  }, { owner: 'NodeJS', repo: 'Node', pr: 12345 })
})

test('validateBuildDestination: rejects unrelated build parameters', (t) => {
  t.assert.throws(() => validateBuildDestination({
    TARGET_GITHUB_ORG: 'nodejs',
    TARGET_REPO_NAME: 'node',
    PR_ID: '99999'
  }, { owner: 'nodejs', repo: 'node', pr: 12345 }), /does not belong/)
})

test('limitResultsMarkdown: truncates at a complete details block', (t) => {
  const buildUrl = 'https://ci.nodejs.org/job/node-test-pull-request/21633/'
  const failure = name => [
    `#### ${name}`,
    '<details>',
    '<summary>See failures</summary>',
    '```',
    'x'.repeat(35_000),
    '```',
    '</details>'
  ].join('\n')
  const markdown = `Failures\n\n${failure('first')}\n\n${failure('second')}`

  const result = limitResultsMarkdown(markdown, buildUrl)

  t.assert.ok(result.length <= 60_000)
  t.assert.match(result, /CI results were truncated/)
  t.assert.ok(result.includes(buildUrl))
  t.assert.doesNotMatch(result, /#### second/)
  t.assert.strictEqual((result.match(/<details>/g) || []).length, 1)
  t.assert.strictEqual((result.match(/<\/details>/g) || []).length, 1)
  t.assert.strictEqual((result.match(/```/g) || []).length, 2)
})

test('limitResultsMarkdown: preserves an excerpt from one oversized details block', (t) => {
  const buildUrl = 'https://ci.nodejs.org/job/node-test-pull-request/21633/'
  const markdown = [
    'Failures',
    '#### first',
    '<details>',
    '<summary>See failures</summary>',
    '```',
    `useful diagnostic\n${'x'.repeat(70_000)}`,
    '```',
    '</details>'
  ].join('\n')

  const result = limitResultsMarkdown(markdown, buildUrl)

  t.assert.ok(result.length <= 60_000)
  t.assert.match(result, /useful diagnostic/)
  t.assert.match(result, /diagnostic output truncated/)
  t.assert.ok(result.includes(buildUrl))
  t.assert.strictEqual((result.match(/<details>/g) || []).length, 1)
  t.assert.strictEqual((result.match(/<\/details>/g) || []).length, 1)
  t.assert.strictEqual((result.match(/```/g) || []).length, 2)
})

test('limitResultsMarkdown: ignores a details closing tag inside diagnostics', (t) => {
  const buildUrl = 'https://ci.nodejs.org/job/node-test-pull-request/21633/'
  const markdown = [
    'Failures',
    '#### first',
    '<details>',
    '<summary>See failures</summary>',
    '```',
    'diagnostic before literal tag',
    '</details>',
    `diagnostic after literal tag\n${'x'.repeat(70_000)}`,
    '```',
    '</details>'
  ].join('\n')

  const result = limitResultsMarkdown(markdown, buildUrl)

  t.assert.ok(result.length <= 60_000)
  t.assert.match(result, /diagnostic after literal tag/)
  t.assert.strictEqual((result.match(/```/g) || []).length, 2)
  t.assert.strictEqual((result.match(/<details>/g) || []).length, 1)
  t.assert.strictEqual((result.match(/<\/details>/g) || []).length, 2)
  t.assert.ok(result.indexOf('CI results were truncated') > result.lastIndexOf('```'))
  t.assert.ok(result.includes(buildUrl))
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
