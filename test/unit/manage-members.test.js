const proxyquire = require('proxyquire')
const tap = require('tap')
const P = require('effd')
const readFixture = require('../read-fixture')
const asyncish = (cb) => setTimeout(cb, Math.random() * 10)

const teamsMembers = {
  '222': [ 'aaa', 'Bbb', 'cCC', 'DDD' ].map((x) => ({ login: x })),
  '333': [ 'alpha', 'omega', 'phi' ].map((x) => ({ login: x })),
  '444': [ 'a', 'b', 'e' ].map((x) => ({ login: x }))
}
const prFiles = {
  '12': [{ filename: 'docs/README.md' }],
  '34': [{ filename: 'app.js' }, { filename: 'package.json' }, { filename: 'readme/md' }],
  '56': [{ filename: 'reaDme.Md', raw_url: 'readme' }]
}
const manageMembers = proxyquire('../../scripts/manage-members.js', {
  '../lib/github-client.js': {
    issues: {
      getComments: () => P([]),
      createComment: () => P()
    },
    pullRequests: {
      getFiles: (options) => {
        return P(prFiles[options.number])
      }
    },
    orgs: {
      getTeams: () => Promise.resolve([
        { name: 'foo', id: 111 },
        { name: 'bar', id: 222 },
        { name: 'botsters', id: 444 },
        { name: 'baz', id: 333 }
      ]),
      getTeamMembers: (options) => Promise.resolve(teamsMembers[options.id]),
      addTeamMembership: (options) => P((Ø) => {
        const members = teamsMembers[options.id]
        asyncish(() => {
          if (!members.find((m) => m.login === options.username)) {
            members.push({ login: options.username })
          }
          Ø.done()
        })
      }),
      removeTeamMembership: (options) => P((Ø) => {
        const members = teamsMembers[options.id]
        asyncish(() => {
          const index = members.findIndex((m) => m.login === options.username)
          if (index > -1) members.splice(index, 1)
          Ø.done()
        })
      })
    },
    users: {
      get: () => Promise.resolve({ login: 'nodejs-github-bot' })
    },
    find: (x) => (array) => Promise.resolve(array.find(x)),
    allPages: (x) => Promise.resolve(x),
    '@noCallThru': true
  },
  'request': (url, cb) => {
    if (url === 'http://404') return cb(null, { statusCode: 404 })
    if (url === 'http://error') return cb(new Error())
    if (url === 'readme') return cb(null, { statusCode: 200 }, readFixture.raw('README.md'))
    if (url === 'https://github.com/undefined/undefined/raw/undefined/README.md') {
      return cb(null, { statusCode: 200 }, readFixture.raw('README.md'))
    }

    cb(null, { statusCode: 200 }, url)
  }
})

// ... the tests:

// download

tap.test('download: returns content', (t) =>
  manageMembers.download('http://someurl')
  .then((content) => {
    t.equal(content, 'http://someurl')
  })
)
tap.test('download: rejects non 200', (t) =>
  manageMembers.download('http://404')
  .then(t.fail)
  .catch((err) => {
    t.type(err, Error)
    t.match(err.message, /^Download Failed:/)
  })
)
tap.test('download: rejects on error', (t) =>
  manageMembers.download('http://error')
  .then(t.fail)
  .catch((err) => {
    t.type(err, Error)
  })
)

// updateMembers

tap.test('updateMembers: adds & removes the changed memebers', (t) =>
  manageMembers.updateMembers({ id: 333, added: [ 'bob', 'omega', 'alice' ], removed: [ 'alpha', 'idontexist' ] })
  .then(() => { // omega, phi, bob, alice
    const members = teamsMembers[333].map((m) => m.login)
    t.equal(members.length, 4)
    t.true(members.includes('omega'))
    t.true(members.includes('bob'))
    t.true(members.includes('alice'))
    t.true(members.includes('phi'))
    t.end()
  })
)

// findChangedMembers

tap.test('findChangedMembers: rejects if Team Not Found', (t) =>
  manageMembers.findChangedMembers('nodejs', 'botfolks', [ 'xray', 'yarn', 'zulu' ])
  .then(t.fail)
  .catch((err) => {
    t.type(err, Error)
    t.match(err.message, /^Team Not Found/)
  })
)
tap.test('findChangedMembers: determines additions and removals', (t) =>
  manageMembers.findChangedMembers('nodejs', 'bar', [ 'xray', 'aaa', 'yarn', 'zulu' ])
  .then((changes) => {
    t.equal(changes.org, 'nodejs')
    t.equal(changes.id, 222)
    t.strictSame(changes.added, [ 'xray', 'yarn', 'zulu' ])
    t.strictSame(changes.removed, [ 'bbb', 'ccc', 'ddd' ])
    t.end()
  })
)

// createMessageBody

tap.test('createMessageBody: returns undefined if no changes', (t) => {
  var messageBody = manageMembers.createMessageBody({ org: 'nodejs', team: 'bot', added: [ 'a', 'b' ], removed: [ 'd', 'e' ] })
  t.equal(messageBody, 'This merge, if accepted, will cause changes to the @nodejs/bot team.\n- Add: @a, @b\n- Remove: @d, @e\n')
  t.end()
})

// parseTeamSection

tap.test('parseTeamSection: rejects if special comment not found', (t) =>
  manageMembers.parseTeamSection("## This README doesn't have the special `team` comment")
  .then(t.fail)
  .catch((err) => {
    t.type(err, Error)
    t.equal(err.message, 'Members section not found')
  })
)
tap.test("parseTeamSection: rejects if special comment isn't JUST right", (t) =>
  manageMembers.parseTeamSection(
    '## Hello\n ## Members <!--team: botsters -->\nThe spacing is off\n<!-- team -->\n# License\nMIT\n'
  )
  .then(t.fail)
  .catch((err) => {
    t.type(err, Error)
    t.equal(err.message, 'Members section not found')
  })
)
tap.test('parseTeamSection: returns empty array if no mentions found', (t) =>
  manageMembers.parseTeamSection(
    '## Hello\n ## Members <!-- team:botsters -->\nno mentions\n<!-- team -->\n# License\nMIT\n'
  )
  .then((data) => {
    t.type(data, Object)
    t.type(data.mentions, Array)
    t.equal(data.name, 'botsters')
    t.equal(data.mentions.length, 0)
    t.end()
  })
)
tap.test('parseTeamSection: returns array of mentions found', (t) =>
  manageMembers.parseTeamSection(readFixture.raw('README.md'))
  .then((data) => {
    t.type(data, Object)
    t.type(data.mentions, Array)
    t.equal(data.name, 'botsters')
    t.strictSame(data.mentions, [ 'a', 'b', 'e' ])
    t.end()
  })
)

// onPullRequest

tap.test('onPullRequest: not default branch', (t) =>
  P(readFixture('pull-request-opened.json'))
  .then((pr) => (pr.repository.default_branch = 'not-master') && pr)
  .then(manageMembers.onPullRequest)
  .then(t.fail)
  .catch((err) => {
    t.type(err, Error)
    t.equal('PR is to non-default branch', err.message)
    t.end()
  })
)
tap.test('onPullRequest: ignores non-root level README', (t) =>
  // bare min event data to get it to the list with a non-root readme
  P({ pull_request: { number: 12, base: {} }, repository: {} })
  .then(manageMembers.onPullRequest)
  .then(t.fail)
  .catch((err) => {
    t.type(err, Error)
    t.equal(err.message, 'README not modified')
    t.end()
  })
)
tap.test('onPullRequest: ignored if README not in changed files', (t) =>
  // bare min event data to get it to the list without a readme.md
  P({ pull_request: { number: 34, base: {} }, repository: {} })
  .then(manageMembers.onPullRequest)
  .then(t.fail)
  .catch((err) => {
    t.type(err, Error)
    t.equal(err.message, 'README not modified')
    t.end()
  })
)
tap.test('onPullRequest: README changed- but members did not', (t) =>
  // bare min event data to get it to the list with a readme.md change
  P({ pull_request: { number: 56, base: {} }, repository: {} })
  .then(manageMembers.onPullRequest)
  .then(t.fail)
  .catch((err) => {
    t.type(err, Error)
    t.equal(err.message, 'No members changed')
    t.end()
  })
)
tap.test('onPullRequest: README changed- members added & removed', (t) => {
  teamsMembers[444] = [ 'a', 'x', 'e', 'y' ].map((x) => ({ login: x }))
  t.teardown(() => {
    teamsMembers[444] = [ 'a', 'b', 'e' ].map((x) => ({ login: x }))
  })
  // bare min event data to get it to the list with a readme.md change
  return P({ pull_request: { number: 56, base: {} }, repository: {} })
  .then(manageMembers.onPullRequest)
  .then((commentBody) => {
    const expected =
      'This merge, if accepted, will cause changes to the @undefined/botsters team.\n' +
      '- Add: @b\n' +
      '- Remove: @x, @y\n'
    t.equal(commentBody, expected)
    t.end()
  })
})

// onPush

tap.test('onPush: not default branch', (t) =>
  P({ ref: 'refs/heads/non-master', repository: { default_branch: 'master' } })
  .then((pr) => (pr.repository.default_branch = 'not-master') && pr)
  .then(manageMembers.onPush)
  .then(t.fail)
  .catch((err) => {
    t.type(err, Error)
    t.equal('Push is on non-default branch', err.message)
    t.end()
  })
)
tap.test('onPush: ignored if README not in changed files', (t) =>
  // bare min event data without a readme.md change
  P({ ref: 'refs/heads/undefined', repository: {}, head_commit: { modified: [], added: [] } })
  .then(manageMembers.onPush)
  .then(t.fail)
  .catch((err) => {
    t.type(err, Error)
    t.equal(err.message, 'README not modified')
    t.end()
  })
)
tap.test('onPush: ignores non-root level README changes', (t) =>
  // bare min event data with a non-root readme.md change
  P({ ref: 'refs/heads/undefined', repository: {}, head_commit: { modified: [ 'docs/README.md' ], added: [] } })
  .then(manageMembers.onPush)
  .then(t.fail)
  .catch((err) => {
    t.type(err, Error)
    t.equal(err.message, 'README not modified')
    t.end()
  })
)
tap.test('onPush: README changed- but members did not', (t) =>
  // bare min event data with a readme.md change
  P({ ref: 'refs/heads/undefined', repository: {}, head_commit: { modified: [ 'README.md' ], added: [] } })
  .then(manageMembers.onPush)
  .then(t.fail)
  .catch((err) => {
    t.type(err, Error)
    t.equal(err.message, 'No members changed')
    t.end()
  })
)
tap.test('onPush: README changed- members added & removed', (t) => {
  teamsMembers[444] = [ 'a', 'x', 'e', 'y' ].map((x) => ({ login: x }))
  t.teardown(() => {
    teamsMembers[444] = [ 'a', 'b', 'e' ].map((x) => ({ login: x }))
  })
  // bare min event data with a readme.md change
  return P({ ref: 'refs/heads/undefined', repository: {}, head_commit: { modified: [ 'README.md' ], added: [] } })
  .then(manageMembers.onPush)
  .then(() => {
    t.equal(teamsMembers[444].length, 3)
    const members = teamsMembers[444].map((m) => m.login)
    t.true(members.includes('a'))
    t.true(members.includes('b'))
    t.true(members.includes('e'))
    t.end()
  })
})
