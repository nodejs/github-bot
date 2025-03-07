import test from 'node:test'
import fetchMock from 'fetch-mock'

import * as nodeRepo from '../../lib/node-repo.js'

import logger from '../../lib/logger.js'
import readFixture from '../read-fixture.js'

fetchMock.mockGlobal()

test('getBotPrLabels(): returns labels added by nodejs-github-bot', (t, done) => {
  const events = readFixture('pull-request-events.json')

  const owner = 'nodejs'
  const repo = 'node5'
  const prId = '1'
  const urlPattern = `glob:https://api.github.com/repos/${owner}/${repo}/issues/${prId}/events?*`

  fetchMock.route(urlPattern, events.data)
  t.plan(2)

  nodeRepo.getBotPrLabels({ owner, repo, prId }, (_, labels) => {
    t.assert.deepStrictEqual(labels, ['testlabel'])
    t.assert.strictEqual(fetchMock.callHistory.called(urlPattern), true)
    done()
  })
})

test('getBotPrLabels(): returns net labels added/removed by nodejs-github-bot', (t, done) => {
  const events = readFixture('pull-request-events-2.json')

  const owner = 'nodejs'
  const repo = 'node6'
  const prId = '2'
  const urlPattern = `glob:https://api.github.com/repos/${owner}/${repo}/issues/${prId}/events?*`

  fetchMock.route(
    urlPattern,
    events.data
  )
  t.plan(2)

  nodeRepo.getBotPrLabels({ owner, repo, prId }, (_, labels) => {
    t.assert.deepStrictEqual(labels, [])
    t.assert.strictEqual(fetchMock.callHistory.called(urlPattern), true)
    done()
  })
})

test('removeLabelFromPR(): should remove label', async (t) => {
  const owner = 'nodejs'
  const repo = 'node7'
  const prId = '3'
  const label = '3'
  const urlPattern = `https://api.github.com/repos/${owner}/${repo}/issues/${prId}/labels/${label}`

  fetchMock.route(
    urlPattern,
    200
  )
  t.plan(2)

  const response = await nodeRepo.removeLabelFromPR({ owner, repo, prId, logger }, label)
  t.assert.deepStrictEqual(label, response)
  t.assert.strictEqual(fetchMock.callHistory.called(urlPattern), true)
})
