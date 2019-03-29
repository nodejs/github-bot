/* eslint-disable no-multi-spaces */
'use strict'

const tap = require('tap')

const nodeLabels = require('../../lib/node-labels')

tap.test('label: lib oddities', (t) => {
  const libFiles = [
    'lib/_debug_agent.js',
    'lib/_http_agent.js',
    'lib/_http_client.js',
    'lib/_http_common.js',
    'lib/_http_incoming.js',
    'lib/_http_outgoing.js',
    'lib/_http_server.js',
    'lib/_linklist.js',
    'lib/_stream_duplex.js',
    'lib/_stream_passthrough.js',
    'lib/_stream_readable.js',
    'lib/_stream_transform.js',
    'lib/_stream_wrap.js',
    'lib/_stream_writable.js',
    'lib/_tls_common.js',
    'lib/_tls_legacy.js',
    'lib/_tls_wrap.js',
    'lib/constants.js',
    'lib/punycode.js', // ignored
    'lib/sys.js', // ignored
    'lib/internal/freelist.js', // ignored
    'lib/internal/process',
    'lib/internal/readme.md', // ignored
    'lib/internal/socket_list.js',
    'lib/internal/v8_prof_polyfill.js',
    'lib/internal/v8_prof_processor.js'
  ]

  const labels = nodeLabels.resolveLabels(libFiles, false)

  t.same(labels, [
    'debugger',       // _debug_agent
    'http',           // _http_*
    'timers',         // linklist
    'stream',         // _stream_*
    'tls',            // _tls_*
    'lib / src',      // constants
    'process',        // internal/process/
    'net',            // socket_list
    'tools'           // v8_prof_*
  ])

  t.end()
})

tap.test('label: lib internals oddities duplicates', (t) => {
  const libFiles = [
    'lib/internal/bootstrap_node.js',
    'lib/internal/linkedlist.js',
    'lib/internal/streams'
  ]

  const labels = nodeLabels.resolveLabels(libFiles)

  t.same(labels, [
    'lib / src', // bootstrap_node
    'timers',    // linkedlist
    'stream'     // internal/streams/
  ])

  t.end()
})

tap.test('label: lib normal without "lib / src" limiting', (t) => {
  const libFiles = [
    'lib/_debugger.js',
    'lib/assert.js',
    'lib/buffer.js',
    'lib/child_process.js',
    'lib/cluster.js',
    'lib/console.js',
    'lib/crypto.js',
    'lib/dgram.js',
    'lib/dns.js',
    'lib/domain.js',
    'lib/events.js',
    'lib/fs.js',
    'lib/http.js',
    'lib/https.js',
    'lib/module.js',
    'lib/net.js',
    'lib/os.js',
    'lib/path.js',
    'lib/process.js',
    'lib/querystring.js',
    'lib/readline.js',
    'lib/repl.js',
    'lib/stream.js',
    'lib/string_decoder.js',
    'lib/timers.js',
    'lib/tls.js',
    'lib/tty.js',
    'lib/url.js',
    'lib/util.js',
    'lib/v8.js',
    'lib/vm.js',
    'lib/zlib.js'
  ]

  const labels = nodeLabels.resolveLabels(libFiles, false)

  t.same(labels, libFiles.map((path) => /lib\/(_)?(\w+)\.js/.exec(path)[2]))

  t.end()
})

tap.test('label: lib internals without "lib / src" limiting', (t) => {
  const libFiles = [
    'lib/internal/child_process.js',
    'lib/internal/cluster.js',
    'lib/internal/module.js',
    'lib/internal/net.js',
    'lib/internal/process.js',
    'lib/internal/readline.js',
    'lib/internal/repl.js',
    'lib/internal/util.js'
  ]

  const labels = nodeLabels.resolveLabels(libFiles, false)

  t.same(labels, libFiles.map((path) => /lib\/internal\/(\w+)\.js/.exec(path)[1]))

  t.end()
})

tap.test('label: add subsystem when ./doc/api/<subsystem>.md has been changed', (t) => {
  const labels = nodeLabels.resolveLabels([
    'doc/api/fs.md'
  ], false)

  t.same(labels, ['doc', 'fs'])

  t.end()
})

tap.test('label: only "doc" with multiple API doc files changed', (t) => {
  const labels = nodeLabels.resolveLabels([
    'doc/api/fs.md',
    'doc/api/stream.md'
  ], false)

  t.same(labels, ['doc'])

  t.end()
})

tap.test('label: "doc,module" when doc/api/modules.md was changed', (t) => {
  const labels = nodeLabels.resolveLabels([
    'doc/api/modules.md'
  ], false)

  t.same(labels, ['doc', 'module'])

  t.end()
})

tap.test('label: appropriate labels for files in internal subdirectories', (t) => {
  const labels = nodeLabels.resolveLabels([
    'lib/internal/cluster/master.js',
    'lib/internal/process/next_tick.js'
  ], false)

  t.same(labels, ['cluster', 'process'])

  t.end()
})
