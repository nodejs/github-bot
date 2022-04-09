const tap = require('tap')

const { findLatestCommitInPr } = require('../../lib/push-jenkins-update')

const nock = require('nock')
const readFixture = require('../read-fixture')
const { ignoreQueryParams } = require('../common')

tap.test('findLatestCommitInPr: paginates results when more than 100 commits in a PR', async (t) => {
  const commitsFixturePage1 = readFixture('pull-requests-commits-page-1.json')
  const commitsFixturePage104 = readFixture('pull-requests-commits-page-104.json')
  const owner = 'nodejs'
  const repo = 'node'
  const pr = 9745

  const headers = {
    Link: '<https://api.github.com/repos/nodejs/node/pulls/9745/commits?page=104>; rel="last"'
  }
  const firstPageScope = nock('https://api.github.com')
    .filteringPath(ignoreQueryParams)
    .get(`/repos/${owner}/${repo}/pulls/${pr}/commits`)
    .reply(200, commitsFixturePage1, headers)

  const lastPageScope = nock('https://api.github.com')
    .get(`/repos/${owner}/${repo}/pulls/${pr}/commits`)
    .query({ page: 104, per_page: 100 })
    .reply(200, commitsFixturePage104)

  t.plan(1)

  const commit = await findLatestCommitInPr({ owner, repo, pr })
  t.equal(commit.sha, 'c1aa949064892dbe693750686c06f4ad5673e577')
  firstPageScope.done()
  lastPageScope.done()
})
