'use strict'

const tap = require('tap')

const { Owners } = require('../../lib/node-owners')
const readFixture = require('../read-fixture')

const ownersFile = readFixture('CODEOWNERS')

tap.test('single file single team match', (t) => {
  const owners = Owners.fromFile(ownersFile)
  t.strictDeepEqual(
    owners.getOwnersForPaths([ 'file1' ]),
    [ '@nodejs/test1' ]
  )
  t.end()
})

tap.test('double file single team match', (t) => {
  const owners = Owners.fromFile(ownersFile)
  t.strictDeepEqual(
    owners.getOwnersForPaths([ 'file1', 'file4' ]),
    [ '@nodejs/test1' ]
  )
  t.end()
})

tap.test('double file double individual team match', (t) => {
  const owners = Owners.fromFile(ownersFile)
  t.strictDeepEqual(
    owners.getOwnersForPaths([ 'file1', 'file2' ]),
    [ '@nodejs/test1', '@nodejs/test2' ]
  )
  t.end()
})

tap.test('single file double team match', (t) => {
  const owners = Owners.fromFile(ownersFile)
  t.strictDeepEqual(
    owners.getOwnersForPaths([ 'file3' ]),
    [ '@nodejs/test1', '@nodejs/test2' ]
  )
  t.end()
})

tap.test('double file triple team match (1 + 2)', (t) => {
  const owners = Owners.fromFile(ownersFile)
  t.strictDeepEqual(
    owners.getOwnersForPaths([ 'file5', 'file3' ]),
    [ '@nodejs/test1', '@nodejs/test2', '@nodejs/test3' ]
  )
  t.end()
})

tap.test('folder match', (t) => {
  const owners = Owners.fromFile(ownersFile)
  t.strictDeepEqual(
    owners.getOwnersForPaths([ 'folder1/file5' ]),
    [ '@nodejs/test3' ]
  )
  t.end()
})

tap.test('extension match', (t) => {
  const owners = Owners.fromFile(ownersFile)
  t.strictDeepEqual(
    owners.getOwnersForPaths([ 'folder2/file1.js' ]),
    [ '@nodejs/test4', '@nodejs/test5' ]
  )
  t.end()
})

tap.test('no match', (t) => {
  const owners = Owners.fromFile(ownersFile)
  t.strictDeepEqual(
    owners.getOwnersForPaths([ 'unknown' ]),
    [ ]
  )
  t.end()
})

tap.test('no match + single match', (t) => {
  const owners = Owners.fromFile(ownersFile)
  t.strictDeepEqual(
    owners.getOwnersForPaths([ 'unknown', 'file1' ]),
    [ '@nodejs/test1' ]
  )
  t.end()
})
