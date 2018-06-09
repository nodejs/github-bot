'use strict'

const tap = require('tap')
const url = require('url')
const nock = require('nock')
const supertest = require('supertest')

const app = require('../../app')

const readFixture = require('../read-fixture')

tap.test('Sends POST requests to https://api.github.com/repos/nodejs/node/statuses/<SHA>', (t) => {
  const jenkinsPayload = readFixture('success-payload.json')

  const prCommitsScope = setupGetCommitsMock('node')
  const scope = nock('https://api.github.com')
                  .filteringPath(ignoreQueryParams)
                  .post('/repos/nodejs/node/statuses/8a5fec2a6bade91e544a30314d7cf21f8a200de1')
                  .reply(201)

  t.plan(1)
  t.tearDown(() => prCommitsScope.done() && scope.done())

  supertest(app)
    .post('/node/jenkins/start')
    .send(jenkinsPayload)
    .expect(201)
    .end((err, res) => {
      t.equal(err, null)
    })
})

tap.test('Allows repository name to be provided with URL parameter when pushing job started', (t) => {
  const jenkinsPayload = readFixture('pending-payload.json')

  const prCommitsScope = setupGetCommitsMock('citgm')
  const scope = nock('https://api.github.com')
                  .filteringPath(ignoreQueryParams)
                  .post('/repos/nodejs/citgm/statuses/8a5fec2a6bade91e544a30314d7cf21f8a200de1')
                  .reply(201)

  t.plan(1)
  t.tearDown(() => prCommitsScope.done() && scope.done())

  supertest(app)
    .post('/citgm/jenkins/start')
    .send(jenkinsPayload)
    .expect(201)
    .end((err, res) => {
      t.equal(err, null)
    })
})

tap.test('Allows repository name to be provided with URL parameter when pushing job ended', (t) => {
  const jenkinsPayload = readFixture('success-payload.json')

  const prCommitsScope = setupGetCommitsMock('citgm')
  const scope = nock('https://api.github.com')
                  .filteringPath(ignoreQueryParams)
                  .post('/repos/nodejs/citgm/statuses/8a5fec2a6bade91e544a30314d7cf21f8a200de1')
                  .reply(201)

  t.plan(1)
  t.tearDown(() => prCommitsScope.done() && scope.done())

  supertest(app)
    .post('/citgm/jenkins/end')
    .send(jenkinsPayload)
    .expect(201)
    .end((err, res) => {
      t.equal(err, null)
    })
})

tap.test('Forwards payload provided in incoming POST to GitHub status API', (t) => {
  const fixture = readFixture('success-payload.json')

  const prCommitsScope = setupGetCommitsMock('node')
  const scope = nock('https://api.github.com')
                  .filteringPath(ignoreQueryParams)
                  .post('/repos/nodejs/node/statuses/8a5fec2a6bade91e544a30314d7cf21f8a200de1', {
                    state: 'success',
                    context: 'test/osx',
                    description: 'tests passed',
                    target_url: 'https://ci.nodejs.org/job/node-test-commit-osx/3157/'
                  })
                  .reply(201)

  t.plan(1)
  t.tearDown(() => prCommitsScope.done() && scope.done())

  supertest(app)
    .post('/node/jenkins/start')
    .send(fixture)
    .expect(201)
    .end((err, res) => {
      t.equal(err, null)
    })
})

tap.test('Responds with 400 / "Bad request" when incoming request has invalid payload', (t) => {
  const fixture = readFixture('invalid-payload.json')

  // don't care about the results, just want to prevent any HTTP request ever being made
  nock('https://api.github.com')

  t.plan(1)

  supertest(app)
    .post('/node/jenkins/start')
    .send(fixture)
    .expect(400, 'Invalid payload')
    .end((err, res) => {
      t.equal(err, null)
    })
})

tap.test('Responds with 400 / "Bad request" when incoming request is not related to a pull request', (t) => {
  const fixture = readFixture('jenkins-staging-failure-payload.json')

  // don't care about the results, just want to prevent any HTTP request ever being made
  nock('https://api.github.com')

  t.plan(1)

  supertest(app)
    .post('/node/jenkins/start')
    .send(fixture)
    .expect(400, 'Will only push builds related to pull requests')
    .end((err, res) => {
      t.equal(err, null)
    })
})

tap.test('Responds with 400 / "Bad request" when incoming providing invalid repository name', (t) => {
  const fixture = readFixture('pending-payload.json')

  // don't care about the results, just want to prevent any HTTP request ever being made
  nock('https://api.github.com')

  t.plan(1)

  supertest(app)
    .post('/not-valid-repo-name/jenkins/start')
    .send(fixture)
    .expect(400, 'Invalid repository')
    .end((err, res) => {
      t.equal(err, null)
    })
})

function setupGetCommitsMock (repoName) {
  const commitsResponse = readFixture('pr-commits.json')

  return nock('https://api.github.com')
            .filteringPath(ignoreQueryParams)
            .get(`/repos/nodejs/${repoName}/pulls/12345/commits`)
            .reply(200, commitsResponse)
}

function ignoreQueryParams (pathAndQuery) {
  return url.parse(pathAndQuery, true).pathname
}
