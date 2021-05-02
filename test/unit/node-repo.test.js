'use strict'

const tap = require('tap')
const nock = require('nock')

const nodeRepo = require('../../lib/node-repo')

const logger = require('../../lib/logger')
const readFixture = require('../read-fixture')
const { ignoreQueryParams } = require('../common')

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

tap.test('removeLabelFromPR(): should remove label', async (t) => {
  const owner = 'nodejs'
  const repo = 'node7'
  const prId = '3'
  const label = '3'

  const scope = nock('https://api.github.com')
    .filteringPath(ignoreQueryParams)
    .delete(`/repos/${owner}/${repo}/issues/${prId}/labels/${label}`)
    .reply(200)
  t.plan(1)

  const response = await nodeRepo.removeLabelFromPR({ owner, repo, prId, logger }, label)
  t.same(label, response)
  scope.done()
})
