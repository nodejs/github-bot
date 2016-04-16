'use strict'

const tap = require('tap')

const nodeLabels = require('../lib/node-labels')

tap.test('label: "test" when only ./test/ files has been changed', (t) => {
  const labels = nodeLabels.resolveLabels([
    'test/debugger/test-debugger-pid.js',
    'test/debugger/test-debugger-repl-break-in-module.js',
    'test/debugger/test-debugger-repl-term.js'
  ])

  t.same(labels, ['test'])

  t.end()
})

tap.test('label: "c++" when ./src/* has been changed', (t) => {
  const labels = nodeLabels.resolveLabels([
    'src/async-wrap.h',
    'src/async-wrap.cc'
  ])

  t.same(labels, ['c++'])

  t.end()
})

//
// Planned tests to be resolved later
//

tap.test('label: "repl" when ./lib/repl.js has been changed', (t) => {
  const labels = nodeLabels.resolveLabels([
    'lib/repl.js',
    'test/debugger/test-debugger-pid.js',
    'test/debugger/test-debugger-repl-break-in-module.js',
    'test/debugger/test-debugger-repl-term.js'
  ])

  t.same(labels, ['repl'], { todo: true })

  t.end()
})

tap.test('label: "lib / src" when more than 5 sub-systems has been changed', (t) => {
  const labels = nodeLabels.resolveLabels([
    'lib/assert.js',
    'lib/dns.js',
    'lib/repl.js',
    'lib/process.js',
    'src/async-wrap.cc',
    'lib/module.js'
  ])

  t.same(labels, ['lib / src'], { todo: true })

  t.end()
})
