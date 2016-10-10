'use strict'

const lolex = require('lolex')
const proxyquire = require('proxyquire')
const sinon = require('sinon')
const tap = require('tap')

const githubClient = require('../../lib/github-client')

tap.test('fetchExistingLabels(): caches existing repository labels', (t) => {
  const fakeGithubClient = sinon.stub(githubClient.issues, 'getLabels').yields(null, [])
  const nodeRepo = proxyquire('../../lib/node-repo', {
    './github-client': fakeGithubClient
  })

  t.plan(1)
  t.tearDown(() => githubClient.issues.getLabels.restore())

  nodeRepo._fetchExistingLabels({ owner: 'nodejs', repo: 'node' }, () => {
    nodeRepo._fetchExistingLabels({ owner: 'nodejs', repo: 'node' }, () => {
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
  t.tearDown(() => clock.uninstall() && githubClient.issues.getLabels.restore())

  nodeRepo._fetchExistingLabels({ owner: 'nodejs', repo: 'node' }, () => {
    // fetch labels again after 1 hour and 1 minute
    clock.tick(1000 * 60 * 61)

    nodeRepo._fetchExistingLabels({ owner: 'nodejs', repo: 'node' }, () => {
      t.equal(fakeGithubClient.callCount, 2)
    })
  })
})
