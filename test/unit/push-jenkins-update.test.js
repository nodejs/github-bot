const tap = require('tap')

const { findLatestCommitInPr } = require('../../lib/push-jenkins-update')

const nock = require('nock')
const readFixture = require('../read-fixture')

tap.test('findLatestCommitInPr: paginates results when more than 100 commits in a PR', async (t) => {
  const commitsFixturePage1 = readFixture('pull-request-commits-page-1.json')
  const commitsFixturePage2 = readFixture('pull-request-commits-page-2.json')
  const commitsFixturePage3 = readFixture('pull-request-commits-page-3.json')
  const commitsFixturePage4 = readFixture('pull-request-commits-page-4.json')
  const owner = 'nodejs'
  const repo = 'node'
  const pr = 9745

  const firstPageScope = nock('https://api.github.com')
    .get(`/repos/${owner}/${repo}/pulls/${pr}/commits`)
    .reply(200, commitsFixturePage1, { link: '<https://api.github.com/repositories/27193779/pulls/9745/commits?page=2>; rel="next", <https://api.github.com/repositories/27193779/pulls/9745/commits?page=4>; rel="last"' })

  const secondPageScope = nock('https://api.github.com')
    .get(`/repositories/27193779/pulls/${pr}/commits`)
    .query({ page: 2 })
    .reply(200, commitsFixturePage2, { link: '<https://api.github.com/repositories/27193779/pulls/9745/commits?page=1>; rel="prev", <https://api.github.com/repositories/27193779/pulls/9745/commits?page=3>; rel="next", <https://api.github.com/repositories/27193779/pulls/9745/commits?page=4>; rel="last", <https://api.github.com/repositories/27193779/pulls/9745/commits?page=1>; rel="first"' })

  const thirdPageScope = nock('https://api.github.com')
    .get(`/repositories/27193779/pulls/${pr}/commits`)
    .query({ page: 3 })
    .reply(200, commitsFixturePage3, { link: '<https://api.github.com/repositories/27193779/pulls/9745/commits?page=2>; rel="prev", <https://api.github.com/repositories/27193779/pulls/9745/commits?page=4>; rel="next", <https://api.github.com/repositories/27193779/pulls/9745/commits?page=4>; rel="last", <https://api.github.com/repositories/27193779/pulls/9745/commits?page=1>; rel="first"' })

  const fourthPageScope = nock('https://api.github.com')
    .get(`/repositories/27193779/pulls/${pr}/commits`)
    .query({ page: 4 })
    .reply(200, commitsFixturePage4, { link: '<https://api.github.com/repositories/27193779/pulls/9745/commits?page=3>; rel="prev", <https://api.github.com/repositories/27193779/pulls/9745/commits?page=1>; rel="first"' })

  t.plan(1)

  const commit = await findLatestCommitInPr({ owner, repo, pr })
  t.equal(commit.sha, 'c1aa949064892dbe693750686c06f4ad5673e577')
  firstPageScope.done()
  secondPageScope.done()
  thirdPageScope.done()
  fourthPageScope.done()
})
