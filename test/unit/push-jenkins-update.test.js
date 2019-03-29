const tap = require('tap')
const proxyquire = require('proxyquire')
const sinon = require('sinon')

const githubClient = require('../../lib/github-client')

const readFixture = require('../read-fixture')

tap.test('findLatestCommitInPr: paginates results when more than 100 commits in a PR', (t) => {
  const commitsFixturePage1 = readFixture('pull-requests-commits-page-1.json')
  const commitsFixturePage104 = readFixture('pull-requests-commits-page-104.json')

  sinon.stub(githubClient.pullRequests, 'getCommits', (options, cb) => cb(null, options.page === 1 ? commitsFixturePage1 : commitsFixturePage104))
  sinon.stub(githubClient, 'hasLastPage', (lastResult) => lastResult === commitsFixturePage1 ? 'https://api.github.com/repos/nodejs/node/pulls/9745/commits?page=104' : undefined)
  const pushJenkinsUpdate = proxyquire('../../lib/push-jenkins-update', { './github-client': githubClient })

  t.plan(2)

  pushJenkinsUpdate.findLatestCommitInPr({
    owner: 'nodejs',
    repo: 'node',
    number: 9745
  }, (err, commit) => {
    t.equal(err, null)
    t.equal(commit.sha, 'c1aa949064892dbe693750686c06f4ad5673e577')
  })
})
