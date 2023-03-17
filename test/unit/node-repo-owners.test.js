'use strict'

const tap = require('tap')
const fetchMock = require('fetch-mock')
const nock = require('nock')

const { resolveOwnersThenPingPr, _testExports } = require('../../lib/node-repo')
const {
  getCodeOwnersUrl,
  listFiles,
  getDefaultBranch,
  getCodeOwnersFile,
  pingOwners,
  getCommentForOwners
} = _testExports
const readFixture = require('../read-fixture')

tap.test('getCodeOwnersUrl', (t) => {
  const owner = 'nodejs'
  const repo = 'node-auto-test'
  const defaultBranch = 'main'

  t.equal(
    getCodeOwnersUrl(owner, repo, defaultBranch),
    `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/.github/CODEOWNERS`
  )
  t.end()
})

tap.test('listFiles success', async (t) => {
  const options = {
    owner: 'nodejs',
    repo: 'node-auto-test',
    prId: 12345,
    logger: { info: () => {}, error: () => {}, debug: () => {}, child: function () { return this } },
    retries: 1,
    defaultBranch: 'main',
    retryInterval: 10
  }

  const fixture = readFixture('pull-request-files.json')
  const urlPattern = `https://api.github.com/repos/${options.owner}/${options.repo}/pulls/${options.prId}/files`
  fetchMock.mock(urlPattern, fixture)

  const files = await listFiles(options)
  t.strictSame(files, fixture.map(({ filename }) => filename))
  t.equal(fetchMock.done(urlPattern), true)
  t.end()
})

tap.test('listFiles fail', async (t) => {
  const options = {
    owner: 'nodejs',
    repo: 'node-auto-test',
    prId: 12346,
    logger: { info: () => {}, error: () => {}, debug: () => {}, child: function () { return this } },
    retries: 1,
    defaultBranch: 'main',
    retryInterval: 10
  }

  const urlPattern = `https://api.github.com/repos/${options.owner}/${options.repo}/pulls/${options.prId}/files`
  fetchMock.mock(urlPattern, 500)

  await t.rejects(listFiles(options))
  t.equal(fetchMock.done(urlPattern), true)
  t.end()
})

tap.test('getDefaultBranch success', async (t) => {
  const options = {
    owner: 'nodejs',
    repo: 'node-auto-test-2',
    prId: 12347,
    logger: { info: () => {}, error: () => {}, debug: () => {}, child: function () { return this } },
    retries: 1,
    defaultBranch: 'main',
    retryInterval: 10
  }

  const fixture = readFixture('get-repository.json')
  const urlPattern = `https://api.github.com/repos/${options.owner}/${options.repo}`
  fetchMock.mock(urlPattern, fixture)

  const defaultBranch = await getDefaultBranch(options)
  t.strictSame(defaultBranch, fixture.default_branch)
  t.equal(fetchMock.done(urlPattern), true)
  t.end()
})

tap.test('getDefaultBranch empty response', async (t) => {
  const options = {
    owner: 'nodejs',
    repo: 'node-auto-test-3',
    prId: 12347,
    logger: { info: () => {}, error: () => {}, debug: () => {}, child: function () { return this } },
    retries: 1,
    defaultBranch: 'main',
    retryInterval: 10
  }

  const urlPattern = `https://api.github.com/repos/${options.owner}/${options.repo}`

  fetchMock.mock(urlPattern, 200)

  await t.rejects(getDefaultBranch(options))
  t.equal(fetchMock.done(), true)
  t.end()
})

tap.test('getDefaultBranch fail', async (t) => {
  const options = {
    owner: 'nodejs',
    repo: 'node-auto-test-4',
    prId: 12347,
    logger: { info: () => {}, error: () => {}, debug: () => {}, child: function () { return this } },
    retries: 1,
    defaultBranch: 'main',
    retryInterval: 10
  }

  const urlPattern = `https://api.github.com/repos/${options.owner}/${options.repo}`
  fetchMock.mock(urlPattern, 500)

  await t.rejects(getDefaultBranch(options))
  t.equal(fetchMock.done(), true)
  t.end()
})

tap.test('getCodeOwnersFile success', async (t) => {
  const options = {
    owner: 'nodejs',
    repo: 'node-auto-test-5',
    prId: 12347,
    logger: { info: () => {}, error: () => {}, debug: () => {}, child: function () { return this } },
    retries: 1,
    defaultBranch: 'main',
    retryInterval: 10
  }

  const fixture = readFixture('CODEOWNERS')
  const base = 'https://localhost'
  const filePath = '/CODEOWNERS'
  const url = `${base}${filePath}`
  const scope = nock(base)
    .get(filePath)
    .reply(200, fixture)

  const file = await getCodeOwnersFile(url, options)
  t.strictSame(file, fixture)
  scope.done()
  t.end()
})

tap.test('getCodeOwnersFile fail', async (t) => {
  const options = {
    owner: 'nodejs',
    repo: 'node-auto-test-6',
    prId: 12347,
    logger: { info: () => {}, error: () => {}, debug: () => {}, child: function () { return this } },
    retries: 1,
    defaultBranch: 'main',
    retryInterval: 10
  }

  const base = 'https://localhost'
  const filePath = '/CODEOWNERS'
  const url = `${base}${filePath}`
  const scope = nock(base)
    .get(filePath)
    .reply(500)

  await t.rejects(getCodeOwnersFile(url, options))
  scope.done()
  t.end()
})

tap.test('pingOwners success', async (t) => {
  const options = {
    owner: 'nodejs',
    repo: 'node-auto-test-6',
    prId: 12348,
    logger: { info: () => {}, error: () => {}, debug: () => {}, child: function () { return this } },
    retries: 1,
    defaultBranch: 'main',
    retryInterval: 10
  }

  const fixture = readFixture('pull-request-create-comment.json')
  const owners = ['@owner1', '@owner2']
  const body = { body: getCommentForOwners(owners) }
  const url = `https://api.github.com/repos/${options.owner}/${options.repo}/issues/${options.prId}/comments`

  fetchMock.mock(
    {
      body,
      method: 'POST',
      url
    },
    {
      status: 201,
      body: fixture
    }
  )

  await pingOwners(options, owners)
  fetchMock.done(url)
  t.end()
})

tap.test('pingOwners fail', async (t) => {
  const options = {
    owner: 'nodejs',
    repo: 'node-auto-test-6',
    prId: 12349,
    logger: { info: () => {}, error: () => {}, debug: () => {}, child: function () { return this } },
    retries: 1,
    defaultBranch: 'main',
    retryInterval: 10
  }

  const url = `https://api.github.com/repos/${options.owner}/${options.repo}/issues/${options.prId}/comments`
  fetchMock.mock({ url, method: 'POST' }, 500)

  await t.rejects(pingOwners(options, []))
  fetchMock.done(url)
  t.end()
})

tap.test('resolveOwnersThenPingPr success', async (t) => {
  const options = {
    owner: 'nodejs',
    repo: 'node-auto-test',
    prId: 99999,
    logger: { info: () => {}, error: () => {}, debug: () => {}, child: function () { return this } },
    retries: 1,
    defaultBranch: 'main',
    retryInterval: 10
  }

  const owners = ['@nodejs/team', '@nodejs/team2']

  fetchMock.mock(
    `https://api.github.com/repos/${options.owner}/${options.repo}/pulls/${options.prId}/files`,
    readFixture('pull-request-files.json')
  )

  fetchMock.mock(
    `https://api.github.com/repos/${options.owner}/${options.repo}`,
    readFixture('get-repository.json')
  )

  const scope = nock('https://raw.githubusercontent.com')
    .get(`/${options.owner}/${options.repo}/master/.github/CODEOWNERS`)
    .reply(200, readFixture('CODEOWNERS'))

  fetchMock.mock(
    {
      body: { body: getCommentForOwners(owners) },
      method: 'POST',
      url: `https://api.github.com/repos/${options.owner}/${options.repo}/issues/${options.prId}/comments`
    },
    {
      status: 201,
      body: readFixture('pull-request-create-comment.json')
    }
  )

  await resolveOwnersThenPingPr(options, owners)

  t.equal(fetchMock.done(), true)
  scope.done()
  t.end()
})
