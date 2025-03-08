import test from 'node:test'
import fetchMock from 'fetch-mock'
import nock from 'nock'

import { _testExports, resolveOwnersThenPingPr } from '../../lib/node-repo.js'
import readFixture from '../read-fixture.js'

const {
  getCodeOwnersUrl,
  listFiles,
  getDefaultBranch,
  getCodeOwnersFile,
  pingOwners,
  getCommentForOwners
} = _testExports

fetchMock.mockGlobal()

test('getCodeOwnersUrl', (t, done) => {
  const owner = 'nodejs'
  const repo = 'node-auto-test'
  const defaultBranch = 'main'

  t.assert.strictEqual(
    getCodeOwnersUrl(owner, repo, defaultBranch),
    `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/.github/CODEOWNERS`
  )
  done()
})

test('listFiles success', async (t) => {
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
  fetchMock.route(urlPattern, fixture)

  const files = await listFiles(options)
  t.assert.deepStrictEqual(files, fixture.map(({ filename }) => filename))
  t.assert.strictEqual(fetchMock.callHistory.called(urlPattern), true)
})

test('listFiles fail', async (t) => {
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
  fetchMock.route(urlPattern, 500)

  await t.assert.rejects(listFiles(options))
  t.assert.strictEqual(fetchMock.callHistory.called(urlPattern), true)
})

test('getDefaultBranch success', async (t) => {
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
  fetchMock.route(urlPattern, fixture)

  const defaultBranch = await getDefaultBranch(options)
  t.assert.deepStrictEqual(defaultBranch, fixture.default_branch)
  t.assert.strictEqual(fetchMock.callHistory.called(urlPattern), true)
})

test('getDefaultBranch empty response', async (t) => {
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

  fetchMock.route(urlPattern, 200)

  await t.assert.rejects(getDefaultBranch(options))
  t.assert.strictEqual(fetchMock.callHistory.called(), true)
})

test('getDefaultBranch fail', async (t) => {
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
  fetchMock.route(urlPattern, 500)

  await t.assert.rejects(getDefaultBranch(options))
  t.assert.strictEqual(fetchMock.callHistory.called(), true)
})

test('getCodeOwnersFile success', async (t) => {
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
  t.assert.deepStrictEqual(file, fixture)
  scope.done()
})

test('getCodeOwnersFile fail', async (t) => {
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

  await t.assert.rejects(getCodeOwnersFile(url, options))
  scope.done()
})

test('pingOwners success', async (t) => {
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

  fetchMock.route(
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
  fetchMock.callHistory.called(url)
})

test('pingOwners fail', async (t) => {
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
  fetchMock.route({ url, method: 'POST' }, 500)

  await t.assert.rejects(pingOwners(options, []))
  fetchMock.callHistory.called(url)
})

test('resolveOwnersThenPingPr success', async (t) => {
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

  fetchMock.route(
    `https://api.github.com/repos/${options.owner}/${options.repo}/pulls/${options.prId}/files`,
    readFixture('pull-request-files.json')
  )

  fetchMock.route(
    `https://api.github.com/repos/${options.owner}/${options.repo}`,
    readFixture('get-repository.json')
  )

  const scope = nock('https://raw.githubusercontent.com')
    .get(`/${options.owner}/${options.repo}/master/.github/CODEOWNERS`)
    .reply(200, readFixture('CODEOWNERS'))

  fetchMock.route(
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

  t.assert.strictEqual(fetchMock.callHistory.called(), true)
  scope.done()
})
