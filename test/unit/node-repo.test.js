'use strict'

const lolex = require('lolex')
const proxyquire = require('proxyquire')
const sinon = require('sinon')
const tap = require('tap')

const logger = require('../../lib/logger')
const githubClient = require('../../lib/github-client')
const readFixture = require('../read-fixture')

tap.test('fetchExistingLabels(): caches existing repository labels', (t) => {
  sinon.stub(githubClient.issues, 'getLabels').yields(null, [])
  sinon.stub(githubClient, 'hasNextPage', () => false)
  const nodeRepo = proxyquire('../../lib/node-repo', {
    './github-client': githubClient
  })

  t.plan(1)
  t.tearDown(() => {
    githubClient.issues.getLabels.restore()
    githubClient.hasNextPage.restore()
  })

  nodeRepo._fetchExistingLabels({ owner: 'nodejs', repo: 'node', logger }, () => {
    nodeRepo._fetchExistingLabels({ owner: 'nodejs', repo: 'node', logger }, () => {
      t.ok(githubClient.issues.getLabels.calledOnce)
    })
  })
})

tap.test('fetchExistingLabels(): cache expires after one hour', (t) => {
  const clock = lolex.install()
  sinon.stub(githubClient.issues, 'getLabels').yields(null, [])
  sinon.stub(githubClient, 'hasNextPage', () => false)
  const nodeRepo = proxyquire('../../lib/node-repo', {
    './github-client': githubClient
  })

  t.plan(1)
  t.tearDown(() => {
    githubClient.issues.getLabels.restore()
    githubClient.hasNextPage.restore()
    clock.uninstall()
  })

  nodeRepo._fetchExistingLabels({ owner: 'nodejs', repo: 'node', logger }, () => {
    // fetch labels again after 1 hour and 1 minute
    clock.tick(1000 * 60 * 61)

    nodeRepo._fetchExistingLabels({ owner: 'nodejs', repo: 'node', logger }, () => {
      t.equal(githubClient.issues.getLabels.callCount, 2)
    })
  })
})

tap.test('fetchExistingLabels(): yields an array of existing label names', (t) => {
  const labelsFixture = readFixture('repo-labels.json')
  sinon.stub(githubClient.issues, 'getLabels').yields(null, labelsFixture)
  sinon.stub(githubClient, 'hasNextPage', () => false)
  const nodeRepo = proxyquire('../../lib/node-repo', {
    './github-client': githubClient
  })

  t.plan(2)
  t.tearDown(() => {
    githubClient.issues.getLabels.restore()
    githubClient.hasNextPage.restore()
  })

  nodeRepo._fetchExistingLabels({ owner: 'nodejs', repo: 'node', logger }, (err, existingLabels) => {
    t.equal(err, null)
    t.ok(existingLabels.includes('cluster'))
  })
})

tap.test('fetchExistingLabels(): can retrieve more than 100 labels', (t) => {
  const labelsFixturePage1 = readFixture('repo-labels.json')
  const labelsFixturePage2 = readFixture('repo-labels-page-2.json')
  sinon.stub(githubClient.issues, 'getLabels', (options, cb) => cb(null, options.page === 1 ? labelsFixturePage1 : labelsFixturePage2))
  sinon.stub(githubClient, 'hasNextPage', (listing) => listing === labelsFixturePage1)
  const nodeRepo = proxyquire('../../lib/node-repo', { './github-client': githubClient })

  t.plan(3)
  t.tearDown(() => {
    githubClient.issues.getLabels.restore()
    githubClient.hasNextPage.restore()
  })
  nodeRepo._fetchExistingLabels({ owner: 'nodejs', repo: 'node', logger }, (err, existingLabels) => {
    t.equal(err, null)
    t.ok(existingLabels.includes('cluster'))
    t.ok(existingLabels.includes('windows'))
  })
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
