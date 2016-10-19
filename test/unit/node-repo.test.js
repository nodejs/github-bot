'use strict'

const lolex = require('lolex')
const proxyquire = require('proxyquire')
const sinon = require('sinon')
const tap = require('tap')

const logger = require('../../lib/logger')
const githubClient = require('../../lib/github-client')
const readFixture = require('../read-fixture')

tap.test('fetchExistingLabels(): caches existing repository labels', (t) => {
  const fakeGithubClient = sinon.stub(githubClient.issues, 'getLabels').yields(null, [])
  const nodeRepo = proxyquire('../../lib/node-repo', {
    './github-client': fakeGithubClient
  })

  t.plan(1)
  t.tearDown(() => githubClient.issues.getLabels.restore())

  nodeRepo._fetchExistingLabels({ owner: 'nodejs', repo: 'node', logger }, () => {
    nodeRepo._fetchExistingLabels({ owner: 'nodejs', repo: 'node', logger }, () => {
      t.ok(fakeGithubClient.calledOnce)
    })
  })
})

tap.test('fetchExistingLabels(): cache expires after one hour', (t) => {
  const clock = lolex.install()
  const fakeGithubClient = sinon.stub(githubClient.issues, 'getLabels').yields(null, [])
  const nodeRepo = proxyquire('../../lib/node-repo', {
    './github-client': fakeGithubClient
  })

  t.plan(1)
  t.tearDown(() => githubClient.issues.getLabels.restore() && clock.uninstall())

  nodeRepo._fetchExistingLabels({ owner: 'nodejs', repo: 'node', logger }, () => {
    // fetch labels again after 1 hour and 1 minute
    clock.tick(1000 * 60 * 61)

    nodeRepo._fetchExistingLabels({ owner: 'nodejs', repo: 'node', logger }, () => {
      t.equal(fakeGithubClient.callCount, 2)
    })
  })
})

tap.test('fetchExistingLabels(): yields an array of existing label names', (t) => {
  const labelsFixture = readFixture('repo-labels.json')
  const fakeGithubClient = sinon.stub(githubClient.issues, 'getLabels').yields(null, labelsFixture)
  const nodeRepo = proxyquire('../../lib/node-repo', {
    './github-client': fakeGithubClient
  })

  t.plan(2)
  t.tearDown(() => githubClient.issues.getLabels.restore())

  nodeRepo._fetchExistingLabels({ owner: 'nodejs', repo: 'node', logger }, (err, existingLabels) => {
    t.equal(err, null)
    t.ok(existingLabels.includes('cluster'))
  })
})
