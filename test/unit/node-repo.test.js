'use strict'

const tap = require('tap')
const lolex = require('lolex')
const nock = require('nock')

const nodeRepo = require('../../lib/node-repo')

const logger = require('../../lib/logger')
const readFixture = require('../read-fixture')
const { ignoreQueryParams } = require('../common')

tap.test('fetchExistingLabels(): caches existing repository labels', async (t) => {
  const owner = 'nodejs'
  const repo = 'node1'
  // Test passes if nock is only called once, no other checks to run
  const scope = nock('https://api.github.com')
    .filteringPath(ignoreQueryParams)
    .get(`/repos/${owner}/${repo}/labels`)
    .once() // should only be called once
    .reply(200, [])

  await nodeRepo._fetchExistingLabels({ owner, repo, logger })
  await nodeRepo._fetchExistingLabels({ owner, repo, logger })
  scope.done()
})

tap.test('fetchExistingLabels(): cache expires after one hour', async (t) => {
  const owner = 'nodejs'
  const repo = 'node2'
  const clock = lolex.install()

  // Test passes if nock is only called once, no other checks to run
  const scope = nock('https://api.github.com')
    .filteringPath(ignoreQueryParams)
    .get(`/repos/${owner}/${repo}/labels`)
    .twice() // should be called twice
    .reply(200, [])

  t.tearDown(() => {
    clock.uninstall()
  })

  await nodeRepo._fetchExistingLabels({ owner, repo, logger })

  // fetch labels again after 1 hour and 1 minute
  clock.tick(1000 * 60 * 61)

  await nodeRepo._fetchExistingLabels({ owner, repo, logger })
  scope.done()
})

tap.test('fetchExistingLabels(): yields an array of existing label names', async (t) => {
  const labelsFixture = readFixture('repo-labels.json')
  const owner = 'nodejs'
  const repo = 'node3'

  const scope = nock('https://api.github.com')
    .filteringPath(ignoreQueryParams)
    .get(`/repos/${owner}/${repo}/labels`)
    .reply(200, labelsFixture.data)

  t.plan(1)

  const existingLabels = await nodeRepo._fetchExistingLabels({ owner, repo, logger })
  t.ok(existingLabels.includes('cluster'))
  scope.done()
})

tap.test('fetchExistingLabels(): can retrieve more than 100 labels', async (t) => {
  const labelsFixturePage1 = readFixture('repo-labels.json')
  const labelsFixturePage2 = readFixture('repo-labels-page-2.json')
  const owner = 'nodejs'
  const repo = 'node4'
  const headers = {
    'Link': `<https://api.github.com/repos/${owner}/${repo}/labels?page=2>; rel="next"`
  }

  const firstPageScope = nock('https://api.github.com')
    .filteringPath(ignoreQueryParams)
    .get(`/repos/${owner}/${repo}/labels`)
    .reply(200, labelsFixturePage1.data, headers)

  const secondPageScope = nock('https://api.github.com')
    .get(`/repos/${owner}/${repo}/labels`)
    .query({ page: 2, per_page: 100, access_token: 'invalid-placeholder-token' })
    .reply(200, labelsFixturePage2.data)

  t.plan(2)

  const existingLabels = await nodeRepo._fetchExistingLabels({ owner, repo, logger })
  t.ok(existingLabels.includes('cluster'))
  t.ok(existingLabels.includes('windows'))
  firstPageScope.done()
  secondPageScope.done()
})

tap.test('getBotPrLabels(): returns labels added by nodejs-github-bot', (t) => {
  const events = readFixture('pull-request-events.json')

  const owner = 'nodejs'
  const repo = 'node5'
  const prId = '1'

  const scope = nock('https://api.github.com')
    .filteringPath(ignoreQueryParams)
    .get(`/repos/${owner}/${repo}/issues/${prId}/events`)
    .reply(200, events.data)

  t.plan(1)

  nodeRepo.getBotPrLabels({ owner, repo, prId }, (_, labels) => {
    t.same(labels, ['testlabel'])
    scope.done()
  })
})

tap.test('getBotPrLabels(): returns net labels added/removed by nodejs-github-bot', (t) => {
  const events = readFixture('pull-request-events-2.json')

  const owner = 'nodejs'
  const repo = 'node6'
  const prId = '2'

  const scope = nock('https://api.github.com')
    .filteringPath(ignoreQueryParams)
    .get(`/repos/${owner}/${repo}/issues/${prId}/events`)
    .reply(200, events.data)
  t.plan(1)

  nodeRepo.getBotPrLabels({ owner, repo, prId }, (_, labels) => {
    t.same(labels, [])
    scope.done()
  })
})
