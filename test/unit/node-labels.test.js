'use strict'

const tap = require('tap')

const nodeLabels = require('../../lib/node-labels')

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

tap.test('label: "doc" & "deprecations" when ./doc/api/deprecations.md has been changed', (t) => {
  const labels = nodeLabels.resolveLabels([
    'doc/api/deprecations.md'
  ])

  t.same(labels, ['doc', 'deprecations'])

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
  ['async_wrap', ['async-wrap-inl.h', 'async-wrap.h', 'async-wrap.cc']],
  ['buffer',
    ['base64.h',
      'node_buffer.cc',
      'node_buffer.h',
      'string_bytes.cc',
      'string_bytes.h',
      'string_search.cc',
      'string_search.h']],
  ['cares', ['cares_wrap.cc']],
  ['child_process', ['process_wrap.cc', 'spawn_sync.cc', 'spawn_sync.h']],
  ['crypto',
    ['node_crypto.cc',
      'node_crypto.h',
      'node_crypto_bio.cc',
      'node_crypto_bio.h',
      'node_crypto_clienthello-inl.h',
      'node_crypto_clienthello.cc',
      'node_crypto_clienthello.h',
      'node_crypto_groups.h']],
  ['debugger', ['debug-agent.cc', 'debug-agent.h', 'node_debug_options.cc']],
  ['dgram', ['udp_wrap.cc', 'udp_wrap.h']],
  ['fs',
    ['fs_event_wrap.cc',
      'node_file.cc',
      'node_file.h',
      'node_stat_watcher.cc',
      'node_stat_watcher.h']],
  ['http_parser', ['node_http_parser.cc', 'node_http_parser.h']],
  ['intl', ['node_i18n.cc', 'node_i18n.h']],
  ['libuv', ['uv.cc']],
  ['net',
    ['connect_wrap.cc',
      'connect_wrap.h',
      'connection_wrap.cc',
      'connection_wrap.h',
      'pipe_wrap.cc',
      'pipe_wrap.h',
      'tcp_wrap.cc',
      'tcp_wrap.h']],
  ['os', ['node_os.cc']],
  ['process', ['node_main.cc', 'signal_wrap.cc']],
  ['timers', ['timer_wrap.cc']],
  ['tracing',
    ['tracing/agent.cc',
      'tracing/agent.h',
      'tracing/node_trace_buffer.cc',
      'tracing/node_trace_buffer.h',
      'tracing/node_trace_writer.cc',
      'tracing/node_trace_writer.h',
      'tracing/trace_event.cc',
      'tracing/trace_event.h']],
  ['tls',
    ['CNNICHashWhitelist.inc',
      'node_root_certs.h',
      'tls_wrap.cc',
      'tls_wrap.h']],
  ['tty', ['tty_wrap.cc', 'tty_wrap.h']],
  [['url-whatwg'],
    ['node_url.cc', 'node_url.h']],
  ['util', ['node_util.cc']],
  ['V8 Engine', ['node_v8.cc', 'v8abbr.h']],
  ['vm', ['node_contextify.cc']],
  ['windows',
    ['backtrace_win32.cc',
      'node_win32_etw_provider-inl.h',
      'node_win32_etw_provider.cc',
      'node_win32_etw_provider.h',
      'node_win32_perfctr_provider.cc',
      'node_win32_perfctr_provider.h']],
  ['zlib', ['node_zlib.cc']]
]
for (const info of srcCases) {
  let labels = info[0]
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

tap.test('label: "inspector" when ./src/inspector_* has been changed', (t) => {
  const labels = nodeLabels.resolveLabels([
    'src/inspector_socket.cc'
  ])

  t.same(labels, ['c++', 'inspector'])

  t.end()
})

tap.test('label: "V8 Engine" when ./deps/v8/ files has been changed', (t) => {
  const labels = nodeLabels.resolveLabels([
    'deps/v8/src/arguments.cc'
  ])

  t.same(labels, ['V8 Engine'])

  t.end()
})

tap.test('label: "libuv" when ./deps/uv/ files has been changed', (t) => {
  const labels = nodeLabels.resolveLabels([
    'deps/uv/src/fs-poll.c'
  ])

  t.same(labels, ['libuv'])

  t.end()
})

tap.test('label: "wasi" when ./deps/uvwasi/ files has been changed', (t) => {
  const labels = nodeLabels.resolveLabels([
    'deps/uvwasi/src/uvwasi.c'
  ])

  t.same(labels, ['wasi'])

  t.end()
})

tap.test('label: "V8 Engine", "openssl" when ./deps/v8/ and ./deps/openssl/ files has been changed', (t) => {
  const labels = nodeLabels.resolveLabels([
    'deps/v8/src/arguments.cc',
    'deps/openssl/openssl/ssl/ssl_rsa.c'
  ])

  t.same(labels, ['V8 Engine', 'openssl'])

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

tap.test('label: "lib / src" when 4 or more JS sub-systems have been changed', (t) => {
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

// https://github.com/nodejs/node/pull/12366 should have been labelled "lib / src"
// https://github.com/nodejs/github-bot/issues/137
tap.test('label: "lib / src" when 4 or more native files have been changed', (t) => {
  const labels = nodeLabels.resolveLabels([
    'node.gyp',
    'src/cares_wrap.cc',
    'src/fs_event_wrap.cc',
    'src/node.cc',
    'src/node_api.cc',
    'src/node_buffer.cc',
    'src/node_config.cc',
    'src/node_constants.cc',
    'src/node_contextify.cc',
    'src/node_file.cc',
    'src/node_file.h',
    'src/node_http_parser.cc',
    'src/node_http_parser.h',
    'src/node_i18n.cc',
    'src/node_revert.cc',
    'src/node_serdes.cc',
    'src/node_zlib.cc',
    'src/process_wrap.cc',
    'src/signal_wrap.cc',
    'src/string_bytes.cc',
    'src/timer_wrap.cc',
    'src/uv.cc'
  ])

  t.same(labels, ['c++', 'lib / src'])

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

  t.same(labels, ['V8 Engine'])

  t.end()
})

tap.test('label: "JS sub-systems when less than 4 sub-systems have changed', (t) => {
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

  t.same(labels, ['build', 'doc'])

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

  t.same(labels, ['V8 Engine', 'v6.x'])

  t.end()
})

tap.test('label: version labels (new, staging)', (t) => {
  const labels = nodeLabels.resolveLabels([
    'deps/v8/include/v8-version.h',
    'deps/v8/src/crankshaft/hydrogen.cc',
    'deps/v8/test/mjsunit/regress/regress-5033.js'
  ], 'v6.x-staging')

  t.same(labels, ['V8 Engine', 'v6.x'])

  t.end()
})

tap.test('label: no version labels (master)', (t) => {
  const labels = nodeLabels.resolveLabels([
    'deps/v8/include/v8-version.h',
    'deps/v8/src/crankshaft/hydrogen.cc',
    'deps/v8/test/mjsunit/regress/regress-5033.js'
  ], 'master')

  t.same(labels, ['V8 Engine'])

  t.end()
})

tap.test('label: build label (windows)', (t) => {
  const labels = nodeLabels.resolveLabels([
    'vcbuild.bat'
  ])

  t.same(labels, ['build', 'windows'])

  t.end()
})

tap.test('label: doc label for non-subsystem API doc changes', (t) => {
  const labels = nodeLabels.resolveLabels([
    'doc/api/_toc.md',
    'doc/api/all.md'
  ])

  t.same(labels, ['doc'])

  t.end()
})

const specificBenchmarks = [
  [[], ['fixtures/alice.html', 'misc/freelist.js']],
  ['assert', ['assert/deepequal-buffer.js']],
  ['buffer', ['buffers/buffer-base64-decode.js']],
  ['child_process', ['child_process/child-process-exec-stdout.js']],
  ['crypto', ['crypto/aes-gcm-throughput.js']],
  ['dgram', ['dgram/bind-params.js']],
  ['domain', ['domain/domain-fn-args.js']],
  ['events', ['events/ee-emit.js']],
  ['fs', ['fs/readfile.js']],
  ['http', ['_http-benchmarkers.js', 'http/simple.js']],
  ['module', ['module/module-loader.js']],
  ['net', ['net/net-c2s.js']],
  ['os', ['os/loadavg.js']],
  ['path', ['path/basename-posix.js']],
  ['process', ['process/memoryUsage.js']],
  ['querystring', ['querystring/querystring-parse.js']],
  ['stream', ['streams/readable-readall.js']],
  ['string_decoder', ['string_decoder/string-decoder.js']],
  ['timers', ['timers/set-immediate-depth.js']],
  ['tls', ['tls/throughput.js']],
  ['url', ['url/url-resolve.js']],
  ['util', ['util/format.js']],
  ['V8 Engine', ['arrays/var-int.js', 'es/defaultparams-bench.js']],
  ['vm', ['vm/run-in-context.js']]
]
for (const info of specificBenchmarks) {
  let labels = info[0]
  if (!Array.isArray(labels)) {
    labels = ['benchmark', labels]
  } else {
    labels = ['benchmark'].concat(labels)
  }
  const files = info[1]
  for (const file of files) {
    tap.test(`label: "${labels.join('","')}" when ./benchmark/${file} has been changed`, (t) => {
      const resolved = nodeLabels.resolveLabels([`benchmark/${file}`])

      t.same(resolved, labels)

      t.end()
    })
  }
}

const moreTools = [
  '.eslintignore', '.editorconfig', '.eslintrc.yaml', '.remarkrc'
]
for (const file of moreTools) {
  tap.test(`label: "tools" when ${file} has been changed`, (t) => {
    const resolved = nodeLabels.resolveLabels([`${file}`])

    t.same(resolved, ['tools'])

    t.end()
  })
}

const specificTests = [
  ['addons', ['addons/async-hello-world/binding.cc']],
  ['debugger', ['debugger/test-debugger-repl.js']],
  [['doc', 'tools'], ['doctool/test-doctool-html.js']],
  [['inspector'],
    ['inspector/test-inspector.js', 'cctest/test_inspector_socket.cc']],
  ['timers', ['timers/test-timers-reliability.js']],
  ['tty', ['pseudo-tty/stdin-setrawmode.js']],
  [['url-whatwg'],
    ['cctest/test_url.cc']]
]
for (const info of specificTests) {
  let labels = info[0]
  if (!Array.isArray(labels)) {
    labels = ['test', labels]
  } else {
    labels = ['test'].concat(labels)
  }
  const files = info[1]
  for (const file of files) {
    tap.test(`label: "${labels.join('","')}" when ./test/${file} has been changed`, (t) => {
      const resolved = nodeLabels.resolveLabels([`test/${file}`])

      t.same(resolved, labels)

      t.end()
    })
  }
}

const specificTools = [
  ['build', ['gyp/gyp_main.py', 'gyp_node.py']],
  ['doc', ['doc/generate.js']],
  ['intl', ['icu/icu-generate.gyp']],
  ['macos',
    ['macosx-firewall.sh',
      'osx-codesign.sh']],
  [['macos', 'install'],
    ['osx-pkg.pmdoc/index.xml.tmpl',
      'pkgsrc/description']],
  [['test', 'npm'], ['test-npm.sh', 'test-npm-package.js']],
  [['test'], ['test.py']],
  [['openssl', 'tls'], ['certdata.txt', 'mkssldef.py', 'mk-ca-bundle.pl']],
  [['windows'], ['sign.bat']],
  [['windows', 'install'], ['msvs/msi/product.wxs']],
  [['V8 Engine'], ['make-v8.sh']]
]
for (const info of specificTools) {
  let labels = info[0]
  if (!Array.isArray(labels)) {
    labels = ['tools', labels]
  } else {
    labels = ['tools'].concat(labels)
  }
  const files = info[1]
  for (const file of files) {
    tap.test(`label: "${labels.join('","')}" when ./tools/${file} has been changed`, (t) => {
      const resolved = nodeLabels.resolveLabels([`tools/${file}`])

      t.same(resolved, labels)

      t.end()
    })
  }
}

[
  [['V8 Engine', 'post-mortem'],
    ['deps/v8/tools/gen-postmortem-metadata.py']],
  [['c++', 'n-api'],
    ['src/node_api.cc', 'src/node_api.h', 'src/node_api_types.h']],
  [['test', 'n-api'],
    ['test/addons-napi/foo']],
  [['doc', 'n-api'],
    ['doc/api/n-api.md']]
].forEach((info) => {
  const labels = info[0]
  const files = info[1]
  for (const file of files) {
    tap.test(`label: "${labels.join('","')}" when ./${file} has been changed`, (t) => {
      const resolved = nodeLabels.resolveLabels([file])

      t.same(resolved, labels)

      t.end()
    })
  }
});

[
  [['async_hooks'], ['lib/async_hooks.js']],
  [['test', 'async_hooks'], ['test/async-hooks/test-connection.ssl.js']]
].forEach((info) => {
  const labels = info[0]
  const files = info[1]
  for (const file of files) {
    tap.test(`label: "${labels.join('","')}" when ./${file} has been changed`, (t) => {
      const resolved = nodeLabels.resolveLabels([file])

      t.same(resolved, labels)

      t.end()
    })
  }
})

tap.test('label: "build" when ./android-configure has been changed', (t) => {
  const labels = nodeLabels.resolveLabels([
    'android-configure'
  ])

  t.same(labels, ['build'])

  t.end()
})

tap.test('label: "build" when ./.travis.yml has been changed', (t) => {
  const labels = nodeLabels.resolveLabels([
    '.travis.yml'
  ])

  t.same(labels, ['build'])

  t.end()
});

[
  [['http2', 'dont-land-on-v6.x'],
    ['lib/http2.js',
      'lib/internal/http2/core.js',
      'deps/nghttp2/lib/nghttp2_buf.c']],
  [['c++', 'http2', 'dont-land-on-v6.x'],
    ['src/node_http2.cc',
      'src/node_http2.h',
      'src/node_http2_core.h',
      'src/node_http2_core-inl.h']],
  [['build', 'http2', 'dont-land-on-v6.x'],
    ['deps/nghttp2/nghttp2.gyp']],
  [['doc', 'http2'], ['doc/api/http2.md']]
].forEach((info) => {
  const labels = info[0]
  const files = info[1]
  for (const file of files) {
    tap.test(`label: "${labels.join('","')}" when ./${file} has been changed`, (t) => {
      const resolved = nodeLabels.resolveLabels([file])

      t.same(resolved, labels)

      t.end()
    })
  }
});

[
  [['c++', 'report'],
    ['src/node_report.cc',
      'src/node_report.h',
      'src/node_report_module.cc',
      'src/node_report_utils.cc']],
  [['doc', 'report'], ['doc/api/report.md']],
  [['test', 'report'], ['test/report/test-report-config.js']]
].forEach((info) => {
  const labels = info[0]
  const files = info[1]
  for (const file of files) {
    tap.test(`label: "${labels.join('","')}" when ./${file} has been changed`, (t) => {
      const resolved = nodeLabels.resolveLabels([file])

      t.same(resolved, labels)

      t.end()
    })
  }
});

[
  // wasi
  [['wasi'],
    ['lib/wasi.js']],
  [['c++', 'wasi'],
    ['src/node_wasi.cc',
      'src/node_wasi.h']],
  [['doc', 'wasi'], ['doc/api/wasi.md']],

  // worker
  [['worker'],
    ['lib/worker_threads.js',
      'lib/internal/worker.js',
      'lib/internal/worker/io.js']],
  [['c++', 'worker'],
    ['src/node_worker.cc',
      'src/node_worker.h']],
  [['doc', 'worker'], ['doc/api/worker_threads.md']]
].forEach((info) => {
  const labels = info[0]
  const files = info[1]
  for (const file of files) {
    tap.test(`label: "${labels.join('","')}" when ./${file} has been changed`, (t) => {
      const resolved = nodeLabels.resolveLabels([file])

      t.same(resolved, labels)

      t.end()
    })
  }
})
