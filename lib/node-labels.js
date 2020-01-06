'use strict'

// order of entries in this map *does* matter for the resolved labels
// earlier entries override later entries
const subSystemLabelsMap = new Map([
  /* src subsystems */
  [/^src\/async-wrap/, ['c++', 'async_wrap']],
  [/^src\/(?:base64|node_buffer|string_)/, ['c++', 'buffer']],
  [/^src\/cares/, ['c++', 'cares']],
  [/^src\/(?:process_wrap|spawn_)/, ['c++', 'child_process']],
  [/^src\/node_crypto/, ['c++', 'crypto']],
  [/^src\/(?:debug-|node_debug)/, ['c++', 'debugger']],
  [/^src\/udp_/, ['c++', 'dgram']],
  [/^src\/(?:fs_|node_file|node_stat_watcher)/, ['c++', 'fs']],
  [/^src\/node_http_parser/, ['c++', 'http_parser']],
  [/^src\/node_i18n/, ['c++', 'intl']],
  [/^src\/uv\./, ['c++', 'libuv']],
  [/^src\/(?:connect(?:ion)?|pipe|tcp)_/, ['c++', 'net']],
  [/^src\/node_os/, ['c++', 'os']],
  [/^src\/(?:node_main|signal_)/, ['c++', 'process']],
  [/^src\/timer_/, ['c++', 'timers']],
  [/^src\/(?:CNNICHashWhitelist|node_root_certs|tls_)/, ['c++', 'tls']],
  [/^src\/tty_/, ['c++', 'tty']],
  [/^src\/node_url/, ['c++', 'url-whatwg']],
  [/^src\/node_util/, ['c++', 'util']],
  [/^src\/(?:node_v8|v8abbr)/, ['c++', 'V8 Engine']],
  [/^src\/node_contextify/, ['c++', 'vm']],
  [/^src\/.*win32.*/, ['c++', 'windows']],
  [/^src\/node_zlib/, ['c++', 'zlib']],
  [/^src\/tracing/, ['c++', 'tracing']],
  [/^src\/node_api/, ['c++', 'n-api']],
  [/^src\/node_http2/, ['c++', 'http2', 'dont-land-on-v6.x']],
  [/^src\/node_report/, ['c++', 'report']],
  [/^src\/node_wasi/, ['c++', 'wasi']],
  [/^src\/node_worker/, ['c++', 'worker']],

  // don't label python files as c++
  [/^src\/.+\.py$/, 'lib / src'],

  // properly label changes to v8 inspector integration-related files
  [/^src\/inspector_/, ['c++', 'inspector']],

  // don't want to label it a c++ update when we're "only" bumping the Node.js version
  [/^src\/(?!node_version\.h)/, 'c++'],
  // BUILDING.md should be marked as 'build' in addition to 'doc'
  [/^BUILDING\.md$/, ['build', 'doc']],
  // meta is a very specific label for things that are policy and or meta-info related
  [/^([A-Z]+$|CODE_OF_CONDUCT|ROADMAP|WORKING_GROUPS|GOVERNANCE|CHANGELOG|\.mail|\.git.+)/, 'meta'],
  // things that edit top-level .md files are always a doc change
  [/^\w+\.md$/, 'doc'],
  // different variants of *Makefile and build files
  [/^(tools\/)?(Makefile|BSDmakefile|create_android_makefiles|\.travis\.yml)$/, 'build'],
  [/^tools\/(install\.py|genv8constants\.py|getnodeversion\.py|js2c\.py|utils\.py|configure\.d\/.*)$/, 'build'],
  [/^vcbuild\.bat$/, ['build', 'windows']],
  [/^(android-)?configure|node\.gyp|common\.gypi$/, 'build'],
  // more specific tools
  [/^tools\/gyp/, ['tools', 'build']],
  [/^tools\/doc\//, ['tools', 'doc']],
  [/^tools\/icu\//, ['tools', 'intl']],
  [/^tools\/(?:osx-pkg\.pmdoc|pkgsrc)\//, ['tools', 'macos', 'install']],
  [/^tools\/(?:(?:mac)?osx-)/, ['tools', 'macos']],
  [/^tools\/test-npm/, ['tools', 'test', 'npm']],
  [/^tools\/test/, ['tools', 'test']],
  [/^tools\/(?:certdata|mkssldef|mk-ca-bundle)/, ['tools', 'openssl', 'tls']],
  [/^tools\/msvs\//, ['tools', 'windows', 'install']],
  [/^tools\/[^/]+\.bat$/, ['tools', 'windows']],
  [/^tools\/make-v8/, ['tools', 'V8 Engine']],
  // all other tool changes should be marked as such
  [/^tools\//, 'tools'],
  [/^\.eslint|\.remark|\.editorconfig/, 'tools'],

  /* Dependencies */
  // libuv needs an explicit mapping, as the ordinary /deps/ mapping below would
  // end up as libuv changes labeled with "uv" (which is a non-existing label)
  [/^deps\/uv\//, 'libuv'],
  [/^deps\/v8\/tools\/gen-postmortem-metadata\.py/, ['V8 Engine', 'post-mortem']],
  [/^deps\/v8\//, 'V8 Engine'],
  [/^deps\/uvwasi\//, 'wasi'],
  [/^deps\/nghttp2\/nghttp2\.gyp/, ['build', 'http2', 'dont-land-on-v6.x']],
  [/^deps\/nghttp2\//, ['http2', 'dont-land-on-v6.x']],
  [/^deps\/([^/]+)/, '$1'],

  /* JS subsystems */
  // Oddities first
  [/^lib\/(punycode|\w+\/freelist|sys\.js)/, ''], // TODO: ignore better?
  [/^lib\/constants\.js$/, 'lib / src'],
  [/^lib\/_(debug_agent|debugger)\.js$/, 'debugger'],
  [/^lib(\/\w+)?\/(_)?link(ed)?list/, 'timers'],
  [/^lib\/\w+\/bootstrap_node/, 'lib / src'],
  [/^lib\/\w+\/v8_prof_/, 'tools'],
  [/^lib\/\w+\/socket_list/, 'net'],
  [/^lib\/\w+\/streams$/, 'stream'],
  [/^lib\/.*http2/, ['http2', 'dont-land-on-v6.x']],
  [/^lib\/worker_threads.js$/, ['worker']],
  [/^lib\/internal\/url\.js$/, ['url-whatwg']],
  [/^lib\/internal\/modules\/esm/, 'ES Modules'],
  // All other lib/ files map directly
  [/^lib\/_(\w+)_\w+\.js?$/, '$1'], // e.g. _(stream)_wrap
  [/^lib(\/internal)?\/(\w+)\.js?$/, '$2'], // other .js files
  [/^lib\/internal\/(\w+)(?:\/|$)/, '$1'] // internal subfolders
])

const jsSubsystemList = [
  'debugger', 'assert', 'async_hooks', 'buffer', 'child_process', 'cluster',
  'console', 'crypto', 'dgram', 'dns', 'domain', 'events', 'esm', 'fs', 'http',
  'https', 'http2', 'module', 'net', 'os', 'path', 'process', 'querystring',
  'readline', 'repl', 'report', 'stream', 'string_decoder', 'timers', 'tls',
  'tty', 'url', 'util', 'v8', 'vm', 'wasi', 'worker', 'zlib'
]

const exclusiveLabelsMap = new Map([
  // more specific tests
  [/^test\/addons\//, ['test', 'addons']],
  [/^test\/debugger\//, ['test', 'debugger']],
  [/^test\/doctool\//, ['test', 'doc', 'tools']],
  [/^test\/timers\//, ['test', 'timers']],
  [/^test\/pseudo-tty\//, ['test', 'tty']],
  [/^test\/inspector\//, ['test', 'inspector']],
  [/^test\/cctest\/test_inspector/, ['test', 'inspector']],
  [/^test\/cctest\/test_url/, ['test', 'url-whatwg']],
  [/^test\/addons-napi\//, ['test', 'n-api']],
  [/^test\/async-hooks\//, ['test', 'async_hooks']],
  [/^test\/report\//, ['test', 'report']],
  [/^test\/fixtures\/es-module/, ['test', 'ES Modules']],
  [/^test\/es-module\//, ['test', 'ES Modules']],

  [/^test\//, 'test'],

  // specific map for modules.md as it should be labeled 'module' not 'modules'
  [/^doc\/api\/modules.md$/, ['doc', 'module']],
  // specific map for esm.md as it should be labeled 'ES Modules' not 'esm'
  [/^doc\/api\/esm.md$/, ['doc', 'ES Modules']],
  // n-api is treated separately since it is not a JS core module but is still
  // considered a subsystem of sorts
  [/^doc\/api\/n-api.md$/, ['doc', 'n-api']],
  // add worker label to PRs that affect doc/api/worker_threads.md
  [/^doc\/api\/worker_threads.md$/, ['doc', 'worker']],
  // automatically tag JS subsystem-specific API doc changes
  [/^doc\/api\/(\w+)\.md$/, ['doc', '$1']],
  // add deprecations label to PRs that affect doc/api/deprecations.md
  [/^doc\/api\/deprecations.md$/, ['doc', 'deprecations']],

  [/^doc\//, 'doc'],

  // more specific benchmarks
  [/^benchmark\/buffers\//, ['benchmark', 'buffer']],
  [/^benchmark\/(?:arrays|es)\//, ['benchmark', 'V8 Engine']],
  [/^benchmark\/_http/, ['benchmark', 'http']],
  [/^benchmark\/(?:misc|fixtures)\//, 'benchmark'],
  [/^benchmark\/streams\//, ['benchmark', 'stream']],
  [/^benchmark\/([^/]+)\//, ['benchmark', '$1']],

  [/^benchmark\//, 'benchmark']
])

function resolveLabels (filepathsChanged, baseBranch, limitLabels = true) {
  const exclusiveLabels = matchExclusiveSubSystem(filepathsChanged)

  if (typeof baseBranch !== 'string') {
    if (typeof baseBranch === 'boolean') {
      limitLabels = baseBranch
    }
    baseBranch = ''
  }

  const labels = (exclusiveLabels.length > 0)
    ? exclusiveLabels
    : matchAllSubSystem(filepathsChanged, limitLabels)

  // Add version labels if PR is made against a version branch
  const m = /^(v\d+\.(?:\d+|x))(?:-staging|$)/.exec(baseBranch)
  if (m) {
    labels.push(m[1])
  }

  return labels
}

function hasAllSubsystems (arr) {
  return arr.every((val) => {
    return jsSubsystemList.includes(val)
  })
}

// This function is needed to help properly identify when a PR should always
// (just) be labeled as 'doc' when it is all changes in doc/api/ that do not
// match subsystem names (e.g. _toc.md, all.md)
function hasAllDocChanges (arr) {
  return arr.every((val) => {
    return /^doc\//.test(val)
  })
}

function hasAllTestChanges (arr) {
  return arr.every((val) => {
    return /^test\//.test(val)
  })
}

function matchExclusiveSubSystem (filepathsChanged) {
  const isExclusive = filepathsChanged.every(matchesAnExclusiveLabel)
  var labels = matchSubSystemsByRegex(exclusiveLabelsMap, filepathsChanged)
  var nonMetaLabels = labels.filter((label) => {
    return !/^dont-/.test(label)
  })

  // if there are multiple API doc changes, do not apply subsystem tags for now
  if (isExclusive &&
    nonMetaLabels.includes('doc') &&
    nonMetaLabels.length > 2 &&
    !hasAllTestChanges(filepathsChanged)) {
    const nonDocLabels = nonMetaLabels.filter((val) => {
      return val !== 'doc'
    })
    if (hasAllSubsystems(nonDocLabels) || hasAllDocChanges(filepathsChanged)) {
      labels = ['doc']
    } else {
      labels = []
    }
  }
  return isExclusive ? labels : []
}

function matchAllSubSystem (filepathsChanged, limitLabels) {
  return matchSubSystemsByRegex(
    subSystemLabelsMap, filepathsChanged, limitLabels)
}

function matchSubSystemsByRegex (rxLabelsMap, filepathsChanged, limitLabels) {
  const labelCount = []
  // by putting matched labels into a map, we avoid duplicate labels
  const labelsMap = filepathsChanged.reduce((map, filepath) => {
    const mappedSubSystems = mappedSubSystemsForFile(rxLabelsMap, filepath)

    if (!mappedSubSystems) {
      // short-circuit
      return map
    }

    for (var i = 0; i < mappedSubSystems.length; ++i) {
      const mappedSubSystem = mappedSubSystems[i]
      if (limitLabels && hasLibOrSrcChanges(filepathsChanged)) {
        if (labelCount.length >= 4) {
          for (const label of labelCount) {
            // don't delete the c++ label as we always want that if it has matched
            if (label !== 'c++') delete map[label]
          }
          map['lib / src'] = true
          // short-circuit
          return map
        } else {
          labelCount.push(mappedSubSystem)
        }
      }

      map[mappedSubSystem] = true
    }

    return map
  }, {})

  return Object.keys(labelsMap)
}

function hasLibOrSrcChanges (filepathsChanged) {
  return filepathsChanged.some((filepath) => filepath.startsWith('lib/') || filepath.startsWith('src/'))
}

function mappedSubSystemsForFile (labelsMap, filepath) {
  for (const [regex, label] of labelsMap) {
    const matches = regex.exec(filepath)

    if (matches === null) {
      continue
    }

    const ret = []
    const labels = Array.isArray(label) ? label : [label]
    labels.forEach((label) => {
      // label names starting with $ means we want to extract a matching
      // group from the regex we've just matched against
      if (label.startsWith('$')) {
        const wantedMatchGroup = label.substr(1)
        label = matches[wantedMatchGroup]
      }
      if (!label) {
        return
      }
      // use label name as is when label doesn't look like a regex matching group
      ret.push(label)
    })
    return ret
  }
}

function matchesAnExclusiveLabel (filepath) {
  return mappedSubSystemsForFile(exclusiveLabelsMap, filepath) !== undefined
}

exports.resolveLabels = resolveLabels
