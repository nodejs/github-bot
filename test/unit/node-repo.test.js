'use strict'

const proxyquire = require('proxyquire')
const sinon = require('sinon')
const tap = require('tap')
const lolex = require('lolex')

const logger = require('../../lib/logger')
const githubClient = require('../../lib/github-client')
const readFixture = require('../read-fixture')

tap.test('fetchExistingLabels(): caches existing repository labels', async (t) => {
  sinon.stub(githubClient.issues, 'listLabelsForRepo', () => Promise.resolve([]))
  sinon.stub(githubClient, 'hasNextPage', () => false)
  const nodeRepo = proxyquire('../../lib/node-repo', {
    './github-client': githubClient
  })

  t.plan(1)
  t.tearDown(() => {
    githubClient.issues.listLabelsForRepo.restore()
    githubClient.hasNextPage.restore()
  })

  await nodeRepo._fetchExistingLabels({ owner: 'nodejs', repo: 'node', logger })
  await nodeRepo._fetchExistingLabels({ owner: 'nodejs', repo: 'node', logger })
  t.ok(githubClient.issues.listLabelsForRepo.calledOnce)
})

tap.test('fetchExistingLabels(): cache expires after one hour', async (t) => {
  const clock = lolex.install()
  sinon.stub(githubClient.issues, 'listLabelsForRepo', () => Promise.resolve([]))
  sinon.stub(githubClient, 'hasNextPage', () => false)
  const nodeRepo = proxyquire('../../lib/node-repo', {
    './github-client': githubClient
  })

  t.plan(1)
  t.tearDown(() => {
    githubClient.issues.listLabelsForRepo.restore()
    githubClient.hasNextPage.restore()
    clock.uninstall()
  })

  await nodeRepo._fetchExistingLabels({ owner: 'nodejs', repo: 'node', logger })

  // fetch labels again after 1 hour and 1 minute
  clock.tick(1000 * 60 * 61)

  await nodeRepo._fetchExistingLabels({ owner: 'nodejs', repo: 'node', logger })
  t.equal(githubClient.issues.listLabelsForRepo.callCount, 2)
})

tap.test('fetchExistingLabels(): yields an array of existing label names', async (t) => {
  const labelsFixture = readFixture('repo-labels.json')
  sinon.stub(githubClient.issues, 'listLabelsForRepo', () => Promise.resolve(labelsFixture))
  sinon.stub(githubClient, 'hasNextPage', () => false)
  const nodeRepo = proxyquire('../../lib/node-repo', {
    './github-client': githubClient
  })

  t.plan(1)
  t.tearDown(() => {
    githubClient.issues.listLabelsForRepo.restore()
    githubClient.hasNextPage.restore()
  })

  const existingLabels = await nodeRepo._fetchExistingLabels({ owner: 'nodejs', repo: 'node', logger })
  t.ok(existingLabels.includes('cluster'))
})

tap.test('fetchExistingLabels(): can retrieve more than 100 labels', async (t) => {
  const labelsFixturePage1 = readFixture('repo-labels.json')
  const labelsFixturePage2 = readFixture('repo-labels-page-2.json')
  sinon.stub(githubClient.issues, 'listLabelsForRepo', (options) => Promise.resolve(options.page === 1 ? labelsFixturePage1 : labelsFixturePage2))
  sinon.stub(githubClient, 'hasNextPage', (listing) => listing === labelsFixturePage1)
  const nodeRepo = proxyquire('../../lib/node-repo', { './github-client': githubClient })

  t.plan(2)
  t.tearDown(() => {
    githubClient.issues.listLabelsForRepo.restore()
    githubClient.hasNextPage.restore()
  })

  const existingLabels = await nodeRepo._fetchExistingLabels({ owner: 'nodejs', repo: 'node', logger })
  t.ok(existingLabels.includes('cluster'))
  t.ok(existingLabels.includes('windows'))
})

tap.test('getBotPrLabels(): returns labels added by nodejs-github-bot', (t) => {
  const events = readFixture('pull-request-events.json')
  sinon.stub(githubClient.issues, 'getEvents', (options, cb) => { cb(null, events) })
  const nodeRepo = proxyquire('../../lib/node-repo', { './github-client': githubClient })

  t.plan(1)
  t.tearDown(() => {
    githubClient.issues.getEvents.restore()
  })

  nodeRepo.getBotPrLabels({ owner: 'nodejs', repo: 'node', prId: '1' }, (_, labels) => {
    t.same(labels, ['testlabel'])
  })
})

tap.test('getBotPrLabels(): returns net labels added/removed by nodejs-github-bot', (t) => {
  const events = readFixture('pull-request-events-2.json')
  sinon.stub(githubClient.issues, 'getEvents', (options, cb) => { cb(null, events) })
  const nodeRepo = proxyquire('../../lib/node-repo', { './github-client': githubClient })

  t.plan(1)
  t.tearDown(() => {
    githubClient.issues.getEvents.restore()
  })

  nodeRepo.getBotPrLabels({ owner: 'nodejs', repo: 'node', prId: '1' }, (_, labels) => {
    t.same(labels, [])
  })
})
