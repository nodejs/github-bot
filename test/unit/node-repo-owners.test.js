'use strict'

const tap = require('tap')
const nock = require('nock')
const url = require('url')

const { resolveOwnersThenPingPr, _testExports } = require('../../lib/node-repo')
const {
  getCodeOwnersUrl,
  getFiles,
  getDefaultBranch,
  getCodeOwnersFile,
  pingOwners,
  getCommentForOwners
} = _testExports
const readFixture = require('../read-fixture')

const options = {
  owner: 'nodejs',
  repo: 'node-auto-test',
  prId: 12345,
  number: 12345,
  logger: { info: () => {}, error: () => {}, debug: () => {}, child: function () { return this } },
  retries: 1,
  defaultBranch: 'main',
  retryInterval: 10
}

tap.test('getCodeOwnersUrl', (t) => {
  const { owner, repo, defaultBranch } = options
  t.strictEqual(
    getCodeOwnersUrl(owner, repo, defaultBranch),
    `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/.github/CODEOWNERS`
  )
  t.end()
})

tap.test('getFiles success', async (t) => {
  const fixture = readFixture('pull-request-files.json')
  const scope = nock('https://api.github.com')
    .filteringPath(ignoreQueryParams)
    .get(`/repos/${options.owner}/${options.repo}/pulls/${options.prId}/files`)
    .reply(200, fixture)

  const files = await getFiles(options)
  t.strictDeepEqual(files, fixture.map(({ filename }) => filename))
  scope.done()
  t.end()
})

tap.test('getFiles fail', async (t) => {
  const scope = nock('https://api.github.com')
    .filteringPath(ignoreQueryParams)
    .get(`/repos/${options.owner}/${options.repo}/pulls/${options.prId}/files`)
    .reply(500)

  await t.rejects(getFiles(options))
  scope.done()
  t.end()
})

tap.test('getDefaultBranch success', async (t) => {
  const fixture = readFixture('get-repository.json')
  const scope = nock('https://api.github.com')
    .filteringPath(ignoreQueryParams)
    .get(`/repos/${options.owner}/${options.repo}`)
    .reply(200, fixture)

  const defaultBranch = await getDefaultBranch(options)
  t.strictDeepEqual(defaultBranch, fixture.default_branch)
  scope.done()
  t.end()
})

tap.test('getDefaultBranch empty response', async (t) => {
  const scope = nock('https://api.github.com')
    .filteringPath(ignoreQueryParams)
    .get(`/repos/${options.owner}/${options.repo}`)
    .reply(200)

  await t.rejects(getDefaultBranch(options))
  scope.done()
  t.end()
})

tap.test('getDefaultBranch fail', async (t) => {
  const scope = nock('https://api.github.com')
    .filteringPath(ignoreQueryParams)
    .get(`/repos/${options.owner}/${options.repo}`)
    .reply(500)

  await t.rejects(getDefaultBranch(options))
  scope.done()
  t.end()
})

tap.test('getCodeOwnersFile success', async (t) => {
  const fixture = readFixture('CODEOWNERS')
  const base = 'https://localhost'
  const filePath = '/CODEOWNERS'
  const url = `${base}${filePath}`
  const scope = nock(base)
    .filteringPath(ignoreQueryParams)
    .get(filePath)
    .reply(200, fixture)

  const file = await getCodeOwnersFile(url, options)
  t.strictDeepEqual(file, fixture)
  scope.done()
  t.end()
})

tap.test('getCodeOwnersFile fail', async (t) => {
  const base = 'https://localhost'
  const filePath = '/CODEOWNERS'
  const url = `${base}${filePath}`
  const scope = nock(base)
    .filteringPath(ignoreQueryParams)
    .get(filePath)
    .reply(500)

  await t.rejects(getCodeOwnersFile(url, options))
  scope.done()
  t.end()
})

tap.test('pingOwners success', async (t) => {
  const fixture = readFixture('pull-request-create-comment.json')
  const owners = [ '@owner1', '@owner2' ]
  const body = JSON.stringify({ body: getCommentForOwners(owners) })
  const scope = nock('https://api.github.com')
    .filteringPath(ignoreQueryParams)
    .post(`/repos/${options.owner}/${options.repo}/issues/${options.prId}/comments`, body)
    .reply(201, fixture)

  await pingOwners(options, owners)
  scope.done()
  t.end()
})

tap.test('pingOwners fail', async (t) => {
  const scope = nock('https://api.github.com')
    .filteringPath(ignoreQueryParams)
    .post(`/repos/${options.owner}/${options.repo}/issues/${options.prId}/comments`)
    .reply(500)

  await t.rejects(pingOwners(options, []))
  scope.done()
  t.end()
})

tap.test('resolveOwnersThenPingPr success', async (t) => {
  const owners = [ '@nodejs/team', '@nodejs/team2' ]
  const scopes = [
    nock('https://api.github.com')
      .filteringPath(ignoreQueryParams)
      .get(`/repos/${options.owner}/${options.repo}/pulls/${options.prId}/files`)
      .reply(200, readFixture('pull-request-files.json')),
    nock('https://api.github.com')
      .filteringPath(ignoreQueryParams)
      .get(`/repos/${options.owner}/${options.repo}`)
      .reply(200, readFixture('get-repository.json')),

    nock('https://raw.githubusercontent.com')
      .filteringPath(ignoreQueryParams)
      .get(`/${options.owner}/${options.repo}/master/.github/CODEOWNERS`)
      .reply(200, readFixture('CODEOWNERS')),
    nock('https://api.github.com')
      .filteringPath(ignoreQueryParams)
      .post(`/repos/${options.owner}/${options.repo}/issues/${options.prId}/comments`, JSON.stringify({ body: getCommentForOwners(owners) }))
      .reply(201, readFixture('pull-request-create-comment.json'))
  ]

  // If promise doesn't reject we succeeded. The last post
  // is tested by nock
  await resolveOwnersThenPingPr(options, owners)

  for (const scope of scopes) {
    scope.done()
  }
  t.end()
})

function ignoreQueryParams (pathAndQuery) {
  return url.parse(pathAndQuery, true).pathname
}
