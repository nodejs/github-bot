'use strict'

const tap = require('tap')

const nodeLabels = require('../../lib/node-labels')

tap.test('label: "test" when only ./test/ files has been changed', (t) => {
  const labels = nodeLabels.resolveLabels([
    'test/debugger/test-debugger-pid.js',
    'test/debugger/test-debugger-repl-break-in-module.js',
    'test/debugger/test-debugger-repl-term.js'
  ])

  t.same(labels, ['test'])

  t.end()
})

tap.test('no labels: when ./test/ and ./doc/ files has been changed', (t) => {
  const labels = nodeLabels.resolveLabels([
    'test/debugger/test-debugger-pid.js',
    'doc/api/fs.md'
  ])

  t.same(labels, [])

  t.end()
})

// This ensures older mislabelling issues doesn't happen again
// https://github.com/nodejs/node/pull/6432
// https://github.com/nodejs/node/pull/6448
tap.test('no labels: when ./test/ and ./lib/ files has been changed', (t) => {
  const labels = nodeLabels.resolveLabels([
    'lib/punycode.js',
    'test/parallel/test-assert.js'
  ])

  t.same(labels, [])

  t.end()
})

tap.test('label: "doc" when only ./doc/ files has been changed', (t) => {
  const labels = nodeLabels.resolveLabels([
    'doc/api/fs.md',
    'doc/api/http.md',
    'doc/onboarding.md'
  ])

  t.same(labels, ['doc'])

  t.end()
})

tap.test('label: "benchmark" when only ./benchmark/ files has been changed', (t) => {
  const labels = nodeLabels.resolveLabels([
    'benchmark/http_server_lag.js',
    'benchmark/http/check_is_http_token.js'
  ])

  t.same(labels, ['benchmark'])

  t.end()
})

tap.test('label: "c++" when ./src/* has been changed', (t) => {
  const labels = nodeLabels.resolveLabels([
    'src/node.cc'
  ])

  t.same(labels, ['c++'])

  t.end()
})

const srcCases = [
  [ 'async_wrap', ['async-wrap-inl.h', 'async-wrap.h', 'async-wrap.cc'] ],
  [ 'buffer',
    ['base64.h',
     'node_buffer.cc',
     'node_buffer.h',
     'string_bytes.cc',
     'string_bytes.h',
     'string_search.cc',
     'string_search.h'] ],
  [ 'cares', ['cares_wrap.cc'] ],
  [ 'child_process', ['process_wrap.cc', 'spawn_sync.cc', 'spawn_sync.h'] ],
  [ 'crypto',
    ['node_crypto.cc',
     'node_crypto.h',
     'node_crypto_bio.cc',
     'node_crypto_bio.h',
     'node_crypto_clienthello-inl.h',
     'node_crypto_clienthello.cc',
     'node_crypto_clienthello.h',
     'node_crypto_groups.h'] ],
  [ 'debugger', ['debug-agent.cc', 'debug-agent.h', 'node_debug_options.cc'] ],
  [ 'dgram', ['udp_wrap.cc', 'udp_wrap.h'] ],
  [ 'fs',
    ['fs_event_wrap.cc',
     'node_file.cc',
     'node_file.h',
     'node_stat_watcher.cc',
     'node_stat_watcher.h'] ],
  [ 'http_parser', ['node_http_parser.cc', 'node_http_parser.h'] ],
  [ 'intl', ['node_i18n.cc', 'node_i18n.h'] ],
  [ 'libuv', ['uv.cc'] ],
  [ 'net',
    ['connect_wrap.cc',
     'connect_wrap.h',
     'connection_wrap.cc',
     'connection_wrap.h',
     'pipe_wrap.cc',
     'pipe_wrap.h',
     'tcp_wrap.cc',
     'tcp_wrap.h'] ],
  [ 'os', ['node_os.cc'] ],
  [ 'process', ['node_main.cc', 'signal_wrap.cc'] ],
  [ 'timers', ['timer_wrap.cc'] ],
  [ 'tracing',
    ['tracing/agent.cc',
     'tracing/agent.h',
     'tracing/node_trace_buffer.cc',
     'tracing/node_trace_buffer.h',
     'tracing/node_trace_writer.cc',
     'tracing/node_trace_writer.h',
     'tracing/trace_event.cc',
     'tracing/trace_event.h'] ],
  [ 'tls',
    ['CNNICHashWhitelist.inc',
     'node_root_certs.h',
     'tls_wrap.cc',
     'tls_wrap.h'] ],
  [ 'tty', ['tty_wrap.cc', 'tty_wrap.h'] ],
  [ ['url-whatwg', 'dont-land-on-v4.x', 'dont-land-on-v6.x'],
    ['node_url.cc', 'node_url.h'] ],
  [ 'util', ['node_util.cc'] ],
  [ 'V8', ['node_v8.cc', 'v8abbr.h'] ],
  [ 'vm', ['node_contextify.cc'] ],
  [ 'windows',
    ['backtrace_win32.cc',
     'node_win32_etw_provider-inl.h',
     'node_win32_etw_provider.cc',
     'node_win32_etw_provider.h',
     'node_win32_perfctr_provider.cc',
     'node_win32_perfctr_provider.h'] ],
  [ 'zlib', ['node_zlib.cc'] ]
]
for (const info of srcCases) {
  var labels = info[0]
  if (!Array.isArray(labels)) {
    labels = [labels]
  }
  const files = info[1]
  for (const file of files) {
    tap.test(`label: "${labels.join('","')}" when ./src/${file} has been changed`, (t) => {
      const resolved = nodeLabels.resolveLabels([`src/${file}`])

      t.same(resolved, ['c++'].concat(labels))

      t.end()
    })
  }
}

tap.test('label: not "c++" when ./src/node_version.h has been changed', (t) => {
  const labels = nodeLabels.resolveLabels([
    'src/node_version.h'
  ])

  t.same(labels, [])

  t.end()
})

tap.test('label: not "c++" when ./src/*.py has been changed', (t) => {
  const labels = nodeLabels.resolveLabels([
    'src/nolttng_macros.py',
    'src/notrace_macros.py',
    'src/perfctr_macros.py'
  ])

  t.same(labels, ['lib / src'])

  t.end()
})

tap.test('label: "v8_inspector" when ./src/inspector_* has been changed', (t) => {
  const labels = nodeLabels.resolveLabels([
    'src/inspector_socket.cc'
  ])

  t.same(labels, ['c++', 'v8_inspector', 'dont-land-on-v4.x'])

  t.end()
})

tap.test('label: "v8" when ./deps/v8/ files has been changed', (t) => {
  const labels = nodeLabels.resolveLabels([
    'deps/v8/src/arguments.cc'
  ])

  t.same(labels, ['v8'])

  t.end()
})

tap.test('label: "libuv" when ./deps/uv/ files has been changed', (t) => {
  const labels = nodeLabels.resolveLabels([
    'deps/uv/src/fs-poll.c'
  ])

  t.same(labels, ['libuv'])

  t.end()
})

tap.test('label: "v8", "openssl" when ./deps/v8/ and ./deps/openssl/ files has been changed', (t) => {
  const labels = nodeLabels.resolveLabels([
    'deps/v8/src/arguments.cc',
    'deps/openssl/openssl/ssl/ssl_rsa.c'
  ])

  t.same(labels, ['v8', 'openssl'])

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

  t.same(labels, ['repl'])

  t.end()
})

tap.test('label: "lib / src" when 5 or more JS sub-systems have been changed', (t) => {
  const labels = nodeLabels.resolveLabels([
    'lib/assert.js',
    'lib/dns.js',
    'lib/repl.js',
    'lib/process.js',
    'lib/module.js'
  ])

  t.same(labels, ['lib / src'])

  t.end()
})

// https://github.com/nodejs/node/pull/7488 wrongfully labelled with "lib / src"
tap.test('label: not "lib / src" when only deps have been changed', (t) => {
  const labels = nodeLabels.resolveLabels([
    'deps/v8/test/cctest/interpreter/bytecode_expectations/ArrayLiterals.golden',
    'deps/v8/test/cctest/interpreter/bytecode_expectations/ArrayLiteralsWide.golden',
    'deps/v8/test/cctest/interpreter/bytecode_expectations/AssignmentsInBinaryExpression.golden',
    'deps/v8/test/cctest/interpreter/bytecode_expectations/BasicBlockToBoolean.golden',
    'deps/v8/test/cctest/interpreter/bytecode_expectations/BasicLoops.golden'
  ])

  t.same(labels, ['v8'])

  t.end()
})

tap.test('label: "JS sub-systems when less than 5 sub-systems have changed', (t) => {
  const labels = nodeLabels.resolveLabels([
    'lib/assert.js',
    'lib/dns.js',
    'lib/repl.js',
    'lib/process.js'
  ])

  t.same(labels, ['assert', 'dns', 'repl', 'process'])

  t.end()
})

tap.test('label: "meta" when meta-info files have changed', (t) => {
  // e.g. LICENSE, AUTHORS, some ./*.md files
  const labels = nodeLabels.resolveLabels([
    '.gitattributes',
    '.gitignore',
    '.mailmap',
    'AUTHORS',
    'LICENSE',
    'CHANGELOG.md',
    'CODE_OF_CONDUCT.md',
    'GOVERNANCE.md',
    'ROADMAP.md',
    'WORKING_GROUPS.md'
  ])

  t.same(labels, ['meta'])

  t.end()
})

tap.test('label: not "meta" when other top-level have been changed', (t) => {
  const labels = nodeLabels.resolveLabels([
    'BUILDING.md',
    'README.md',
    'COLLABORATOR_GUIDE.md',
    'CONTRIBUTING.md',
    'configure'
  ])

  t.same(labels.indexOf('meta'), -1)

  t.end()
})

tap.test('label: "doc" when top-level .md files have changed', (t) => {
  const labels = nodeLabels.resolveLabels([
    'BUILDING.md',
    'README.md'
  ])

  t.same(labels, ['doc'])

  t.end()
})

tap.test('label: not "doc" when other top-level files have been changed', (t) => {
  const labels = nodeLabels.resolveLabels([
    'LICENSE',
    'configure',
    '.mailmap'
  ])

  t.same(labels.indexOf('doc'), -1)

  t.end()
})

tap.test('label: version labels (old)', (t) => {
  const labels = nodeLabels.resolveLabels([
    'common.gypi'
  ], 'v0.12')

  t.same(labels, ['build', 'v0.12'])

  t.end()
})

tap.test('label: version labels (old, staging)', (t) => {
  const labels = nodeLabels.resolveLabels([
    'common.gypi'
  ], 'v0.12-staging')

  t.same(labels, ['build', 'v0.12'])

  t.end()
})

tap.test('label: version labels (new)', (t) => {
  const labels = nodeLabels.resolveLabels([
    'deps/v8/include/v8-version.h',
    'deps/v8/src/crankshaft/hydrogen.cc',
    'deps/v8/test/mjsunit/regress/regress-5033.js'
  ], 'v6.x')

  t.same(labels, ['v8', 'v6.x'])

  t.end()
})

tap.test('label: version labels (new, staging)', (t) => {
  const labels = nodeLabels.resolveLabels([
    'deps/v8/include/v8-version.h',
    'deps/v8/src/crankshaft/hydrogen.cc',
    'deps/v8/test/mjsunit/regress/regress-5033.js'
  ], 'v6.x-staging')

  t.same(labels, ['v8', 'v6.x'])

  t.end()
})

tap.test('label: no version labels (master)', (t) => {
  const labels = nodeLabels.resolveLabels([
    'deps/v8/include/v8-version.h',
    'deps/v8/src/crankshaft/hydrogen.cc',
    'deps/v8/test/mjsunit/regress/regress-5033.js'
  ], 'master')

  t.same(labels, ['v8'])

  t.end()
})

tap.test('label: tools label', (t) => {
  const labels = nodeLabels.resolveLabels([
    'tools/doc/json.js'
  ])

  t.same(labels, ['tools'])

  t.end()
})

tap.test('label: build label (windows)', (t) => {
  const labels = nodeLabels.resolveLabels([
    'vcbuild.bat'
  ])

  t.same(labels, ['build'])

  t.end()
})

tap.test('label: dont-land-on labels for WHATWG URL', (t) => {
  const labels = nodeLabels.resolveLabels([
    'lib/internal/url.js'
  ])

  t.same(labels, ['url-whatwg', 'dont-land-on-v4.x', 'dont-land-on-v6.x'])

  t.end()
})
