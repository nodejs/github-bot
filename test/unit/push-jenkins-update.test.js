import test from 'node:test'

import { findLatestCommitInPr } from '../../lib/push-jenkins-update.js'

import fetchMock from 'fetch-mock'
import readFixture from '../read-fixture.js'

test('findLatestCommitInPr: paginates results when more than 100 commits in a PR', async (t) => {
  const commitsFixturePage1 = readFixture('pull-request-commits-page-1.json')
  const commitsFixturePage2 = readFixture('pull-request-commits-page-2.json')
  const commitsFixturePage3 = readFixture('pull-request-commits-page-3.json')
  const commitsFixturePage4 = readFixture('pull-request-commits-page-4.json')
  const owner = 'nodejs'
  const repo = 'node'
  const pr = 9745

  fetchMock.mockGlobal()

  const firstPageScope = fetchMock.route(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${pr}/commits`,
    {
      body: commitsFixturePage1,
      headers: {
        link: '<https://api.github.com/repositories/27193779/pulls/9745/commits?page=2>; rel="next", <https://api.github.com/repositories/27193779/pulls/9745/commits?page=4>; rel="last"'
      }
    }
  )

  const secondPageScope = fetchMock.route(
    `https://api.github.com/repositories/27193779/pulls/${pr}/commits?page=2`,
    {
      body: commitsFixturePage2,
      headers: {
        link: '<https://api.github.com/repositories/27193779/pulls/9745/commits?page=1>; rel="prev", <https://api.github.com/repositories/27193779/pulls/9745/commits?page=3>; rel="next", <https://api.github.com/repositories/27193779/pulls/9745/commits?page=4>; rel="last", <https://api.github.com/repositories/27193779/pulls/9745/commits?page=1>; rel="first"'
      }
    }
  )

  const thirdPageScope = fetchMock.route(
    `https://api.github.com/repositories/27193779/pulls/${pr}/commits?page=3`,
    {
      body: commitsFixturePage3,
      headers: {
        link: '<https://api.github.com/repositories/27193779/pulls/9745/commits?page=2>; rel="prev", <https://api.github.com/repositories/27193779/pulls/9745/commits?page=4>; rel="next", <https://api.github.com/repositories/27193779/pulls/9745/commits?page=4>; rel="last", <https://api.github.com/repositories/27193779/pulls/9745/commits?page=1>; rel="first"'
      }
    }
  )

  const fourthPageScope = fetchMock.route(
    `https://api.github.com/repositories/27193779/pulls/${pr}/commits?page=4`,
    {
      body: commitsFixturePage4,
      headers: {
        link: '<https://api.github.com/repositories/27193779/pulls/9745/commits?page=3>; rel="prev", <https://api.github.com/repositories/27193779/pulls/9745/commits?page=1>; rel="first"'
      }
    }
  )

  t.plan(1)

  const commit = await findLatestCommitInPr({ owner, repo, pr })
  t.assert.strictEqual(commit.sha, 'c1aa949064892dbe693750686c06f4ad5673e577')
  firstPageScope.callHistory.called()
  secondPageScope.callHistory.called()
  thirdPageScope.callHistory.called()
  fourthPageScope.callHistory.called()
})
