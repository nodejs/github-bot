import test from 'node:test'

import { Owners } from '../../lib/node-owners.js'
import readFixture from '../read-fixture.js'

const ownersFile = readFixture('CODEOWNERS')

test('single file single team match', (t, done) => {
  const owners = Owners.fromFile(ownersFile)
  t.assert.deepStrictEqual(
    owners.getOwnersForPaths(['file1']),
    ['@nodejs/test1']
  )
  done()
})

test('double file single team match', (t, done) => {
  const owners = Owners.fromFile(ownersFile)
  t.assert.deepStrictEqual(
    owners.getOwnersForPaths(['file1', 'file4']),
    ['@nodejs/test1']
  )
  done()
})

test('double file double individual team match', (t, done) => {
  const owners = Owners.fromFile(ownersFile)
  t.assert.deepStrictEqual(
    owners.getOwnersForPaths(['file1', 'file2']),
    ['@nodejs/test1', '@nodejs/test2']
  )
  done()
})

test('single file double team match', (t, done) => {
  const owners = Owners.fromFile(ownersFile)
  t.assert.deepStrictEqual(
    owners.getOwnersForPaths(['file3']),
    ['@nodejs/test1', '@nodejs/test2']
  )
  done()
})

test('double file triple team match (1 + 2)', (t, done) => {
  const owners = Owners.fromFile(ownersFile)
  t.assert.deepStrictEqual(
    owners.getOwnersForPaths(['file5', 'file3']),
    ['@nodejs/test1', '@nodejs/test2', '@nodejs/test3']
  )
  done()
})

test('folder match', (t, done) => {
  const owners = Owners.fromFile(ownersFile)
  t.assert.deepStrictEqual(
    owners.getOwnersForPaths(['folder1/file5']),
    ['@nodejs/test3']
  )
  done()
})

test('extension match', (t, done) => {
  const owners = Owners.fromFile(ownersFile)
  t.assert.deepStrictEqual(
    owners.getOwnersForPaths(['folder2/file1.js']),
    ['@nodejs/test4', '@nodejs/test5']
  )
  done()
})

test('no match', (t, done) => {
  const owners = Owners.fromFile(ownersFile)
  t.assert.deepStrictEqual(
    owners.getOwnersForPaths(['unknown']),
    []
  )
  done()
})

test('no match + single match', (t, done) => {
  const owners = Owners.fromFile(ownersFile)
  t.assert.deepStrictEqual(
    owners.getOwnersForPaths(['unknown', 'file1']),
    ['@nodejs/test1']
  )
  done()
})
