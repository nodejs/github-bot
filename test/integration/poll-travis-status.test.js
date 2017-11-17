'use strict'

const tap = require('tap')
const url = require('url')
const nock = require('nock')
const readFixture = require('../read-fixture')

const logger = require('../../lib/logger')
const pollTravis = require('../../lib/pollTravis')

tap.test('Poll for Travis builds', (t) => {
  const commitsResponse = readFixture('pr-commits-for-travis.json')
  const prCommitsScope = nock('https://api.github.com')
                      .filteringPath(ignoreQueryParams)
                      .get('/repos/nodejs/node-core-utils/pulls/100/commits')
                      .reply(200, commitsResponse)

  const buildWithoutCommits = readFixture('travis-build-no-commits.json')
  const buildCreated = readFixture('travis-build-created.json')
  const buildPassed = readFixture('travis-build-passed.json')
  const noCommitBuildScope = nock('https://api.travis-ci.org')
                  .filteringPath(ignoreQueryParams)
                  .get('/repos/nodejs/node-core-utils/builds')
                  .reply(200, buildWithoutCommits)
  const createdBuildScope = nock('https://api.travis-ci.org')
                  .filteringPath(ignoreQueryParams)
                  .get('/repos/nodejs/node-core-utils/builds')
                  .reply(200, buildCreated)
  const passedBuildScope = nock('https://api.travis-ci.org')
                  .filteringPath(ignoreQueryParams)
                  .get('/repos/nodejs/node-core-utils/builds')
                  .reply(200, buildPassed)

  const pendingStatusScope = nock('https://api.github.com')
                    .filteringPath(ignoreQueryParams)
                    .post('/repos/nodejs/node-core-utils/statuses/4795f8748cc06ee220438201db3b74a9b333e21e', {
                      'state': 'pending',
                      'target_url': 'https://travis-ci.org/nodejs/node-core-utils/builds/302956738',
                      'description': 'build in progress',
                      'context': 'Travis CI via nodejs-github-bot'
                    })
                    .reply(201)

  const passedStatusScope = nock('https://api.github.com')
                    .filteringPath(ignoreQueryParams)
                    .post('/repos/nodejs/node-core-utils/statuses/4795f8748cc06ee220438201db3b74a9b333e21e', {
                      'state': 'success',
                      'target_url': 'https://travis-ci.org/nodejs/node-core-utils/builds/302956738',
                      'description': 'all tests passed',
                      'context': 'Travis CI via nodejs-github-bot'
                    })
                    .reply(201)

  t.tearDown(() => {
    nock.cleanAll()
  })

  pollTravis.pollThenStatus({
    owner: 'nodejs',
    repo: 'node-core-utils',
    pr: 100,
    retry: 10,
    interval: 0.01,
    logger: logger
  })

  setTimeout(() => {
    prCommitsScope.done()
    noCommitBuildScope.done()
    createdBuildScope.done()
    passedBuildScope.done()
    pendingStatusScope.done()
    passedStatusScope.done()
    t.end()
  }, 100)
})

tap.test('Skip if cannot get the commits', (t) => {
  const prCommitsScope = nock('https://api.github.com')
                      .filteringPath(ignoreQueryParams)
                      .get('/repos/nodejs/node-core-utils/pulls/100/commits')
                      .reply(404)

  const travisScope = nock('https://api.travis-ci.org')
                  .filteringPath(ignoreQueryParams)
                  .get('/repos/nodejs/node-core-utils/builds')
                  .reply(404)

  pollTravis.pollThenStatus({
    owner: 'nodejs',
    repo: 'node-core-utils',
    pr: 100,
    retry: 10,
    interval: 0.01,
    logger: logger
  })

  t.plan(1)

  t.tearDown(() => {
    nock.cleanAll()
  })

  setTimeout(() => {
    prCommitsScope.done()
    t.ok(!travisScope.isDone())
  }, 100)
})

tap.test('Handle build failure', (t) => {
  const commitsResponse = readFixture('pr-commits-for-travis.json')
  const prCommitsScope = nock('https://api.github.com')
                      .filteringPath(ignoreQueryParams)
                      .get('/repos/nodejs/node-core-utils/pulls/100/commits')
                      .reply(200, commitsResponse)

  const buildFailed = readFixture('travis-build-failed.json')
  const failedBuildScope = nock('https://api.travis-ci.org')
                  .filteringPath(ignoreQueryParams)
                  .get('/repos/nodejs/node-core-utils/builds')
                  .reply(200, buildFailed)

  const failedStatusScope = nock('https://api.github.com')
                    .filteringPath(ignoreQueryParams)
                    .post('/repos/nodejs/node-core-utils/statuses/4795f8748cc06ee220438201db3b74a9b333e21e', {
                      'state': 'failure',
                      'target_url': 'https://travis-ci.org/nodejs/node-core-utils/builds/302956738',
                      'description': 'build failure',
                      'context': 'Travis CI via nodejs-github-bot'
                    })
                    .reply(201)

  t.tearDown(() => {
    nock.cleanAll()
  })

  pollTravis.pollThenStatus({
    owner: 'nodejs',
    repo: 'node-core-utils',
    pr: 100,
    retry: 10,
    interval: 0.01,
    logger: logger
  })

  setTimeout(() => {
    prCommitsScope.done()
    failedBuildScope.done()
    failedStatusScope.done()
    t.end()
  }, 100)
})

function ignoreQueryParams (pathAndQuery) {
  return url.parse(pathAndQuery, true).pathname
}
