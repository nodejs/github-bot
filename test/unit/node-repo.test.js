import tap from 'tap'
import fetchMock from 'fetch-mock'

import * as nodeRepo from '../../lib/node-repo.js'

import logger from '../../lib/logger.js'
import readFixture from '../read-fixture.js'

tap.test('getBotPrLabels(): returns labels added by nodejs-github-bot', (t) => {
  const events = readFixture('pull-request-events.json')

  const owner = 'nodejs'
  const repo = 'node5'
  const prId = '1'
  const urlPattern = `glob:https://api.github.com/repos/${owner}/${repo}/issues/${prId}/events?*`

  fetchMock.mock(urlPattern, events.data)
  t.plan(2)

  nodeRepo.getBotPrLabels({ owner, repo, prId }, (_, labels) => {
    t.same(labels, ['testlabel'])
    t.equal(fetchMock.done(urlPattern), true)
  })
})

tap.test('getBotPrLabels(): returns net labels added/removed by nodejs-github-bot', (t) => {
  const events = readFixture('pull-request-events-2.json')

  const owner = 'nodejs'
  const repo = 'node6'
  const prId = '2'
  const urlPattern = `glob:https://api.github.com/repos/${owner}/${repo}/issues/${prId}/events?*`

  fetchMock.mock(
    urlPattern,
    events.data
  )
  t.plan(2)

  nodeRepo.getBotPrLabels({ owner, repo, prId }, (_, labels) => {
    t.same(labels, [])
    t.equal(fetchMock.done(urlPattern), true)
  })
})

tap.test('removeLabelFromPR(): should remove label', async (t) => {
  const owner = 'nodejs'
  const repo = 'node7'
  const prId = '3'
  const label = '3'
  const urlPattern = `https://api.github.com/repos/${owner}/${repo}/issues/${prId}/labels/${label}`

  fetchMock.mock(
    urlPattern,
    200
  )
  t.plan(2)

  const response = await nodeRepo.removeLabelFromPR({ owner, repo, prId, logger }, label)
  t.same(label, response)
  t.equal(fetchMock.done(urlPattern), true)
})
