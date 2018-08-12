const tap = require('tap')
const proxyquire = require('proxyquire')
const nock = require('nock')
const url = require('url')

const readFixture = require('../read-fixture')

const githubClient = require('../../lib/github-client')
const { checkPullRequests } = proxyquire('../../lib/node-land-checks', { './github-client': githubClient })

function ignoreQueryParams (pathAndQuery) {
  return url.parse(pathAndQuery, true).pathname
}

tap.test('node-land-checks: updates applicable PRs', (t) => {
  const pullRequestsResponse = readFixture('pull-requests.json')

  const pullRequestsScope = nock('https://api.github.com')
                       .filteringPath(ignoreQueryParams)
                       .get('/repos/nodejs/node/pulls')
                       .reply(200, pullRequestsResponse)

  const statusScope = nock('https://api.github.com')
                       .filteringPath(ignoreQueryParams)
                       .post('/repos/nodejs/node/statuses/aae34fdac0caea4e4aa204aeade6a12befe32e73', {
                         state: 'success',
                         target_url: '',
                         description: 'Pull requests must remain open for at least 72 hours',
                         context: 'wait-time'
                       })
                       .reply(201)

  t.plan(0)
  t.tearDown(() => pullRequestsScope.done() && statusScope.done())

  checkPullRequests()
})
