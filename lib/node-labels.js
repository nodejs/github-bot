'use strict'

// order of entries in this map *does* matter for the resolved labels
// earlier entries override later entries
const subSystemLabelsMap = new Map([
  // properly label changes to v8 inspector integration-related files
  [/^src\/inspector_/, ['c++', 'v8_inspector', 'dont-land-on-v4.x']],
  // don't want to label it a c++ update when we're "only" bumping the Node.js version
  [/^src\/(?!node_version\.h)/, 'c++'],
  // meta is a very specific label for things that are policy and or meta-info related
  [/^([A-Z]+$|CODE_OF_CONDUCT|ROADMAP|WORKING_GROUPS|GOVERNANCE|CHANGELOG|\.mail|\.git.+)/, 'meta'],
  // things that edit top-level .md files are always a doc change
  [/^\w+\.md$/, 'doc'],
  // different variants of *Makefile and build files
  [/^(tools\/)?(Makefile|BSDmakefile|create_android_makefiles)$/, 'build'],
  [/^tools\/(install.py|genv8constants.py|getnodeversion.py|js2c.py|utils.py|configure.d\/.*)$/, 'build'],
  [/^(configure|node.gyp|common.gypi|vcbuild.bat)$/, 'build'],
  // all other tools/ changes should be marked as such
  [/^tools\//, 'tools'],

  /* Dependencies */
  // libuv needs an explicit mapping, as the ordinary /deps/ mapping below would
  // end up as libuv changes labeled with "uv" (which is a non-existing label)
  [/^deps\/uv\//, 'libuv'],
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
  // All other lib/ files map directly
  [/^lib\/_(\w+)_\w+\.js?$/, '$1'], // e.g. _(stream)_wrap
  [/^lib(\/internal)?\/(\w+)\.js?$/, '$2'], // other .js files
  [/^lib\/internal\/(\w+)$/, '$1'] // internal subfolders
])

const jsSubsystemList = [
  'debugger', 'assert', 'buffer', 'child_process', 'cluster', 'console',
  'crypto', 'dgram', 'dns', 'domain', 'events', 'fs', 'http', 'https', 'module',
  'net', 'os', 'path', 'process', 'querystring', 'readline', 'repl', 'stream',
  'string_decoder', 'timers', 'tls', 'tty', 'url', 'util', 'v8', 'vm', 'zlib'
]

const exclusiveLabelsMap = new Map([
  [/^test\//, 'test'],
  // specific map for modules.md as it should be labeled 'module' not 'modules'
  [/^doc\/api\/modules.md$/, ['doc', 'module']],
  // automatically tag subsystem-specific API doc changes
  [/^doc\/api\/(\w+).md$/, ['doc', '$1']],
  [/^doc\//, 'doc'],
  [/^benchmark\//, 'benchmark']
])

function resolveLabels (filepathsChanged, baseBranch, limitLib = true) {
  const exclusiveLabels = matchExclusiveSubSystem(filepathsChanged)

  if (typeof baseBranch !== 'string') {
    if (typeof baseBranch === 'boolean') {
      limitLib = baseBranch
    }
    baseBranch = ''
  }

  const labels = (exclusiveLabels.length > 0)
                  ? exclusiveLabels
                  : matchAllSubSystem(filepathsChanged, limitLib)

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

function matchExclusiveSubSystem (filepathsChanged) {
  const isExclusive = filepathsChanged.every(matchesAnExclusiveLabel)
  var labels = matchSubSystemsByRegex(exclusiveLabelsMap, filepathsChanged)
  // if there are multiple API doc changes, do not apply subsystem tags for now
  if (isExclusive &&
      labels.includes('doc') &&
      labels.length > 2) {
    const nonDocLabels = labels.filter((val) => {
      return val !== 'doc'
    })
    if (hasAllSubsystems(nonDocLabels)) {
      labels = ['doc']
    } else {
      labels = []
    }
  }
  return isExclusive ? labels : []
}

function matchAllSubSystem (filepathsChanged, limitLib) {
  return matchSubSystemsByRegex(
      subSystemLabelsMap, filepathsChanged, limitLib)
}

function matchSubSystemsByRegex (rxLabelsMap, filepathsChanged, limitLib) {
  const jsLabelCount = []
  // by putting matched labels into a map, we avoid duplicate labels
  const labelsMap = filepathsChanged.reduce((map, filepath) => {
    const mappedSubSystems = mappedSubSystemsForFile(rxLabelsMap, filepath)

    if (!mappedSubSystems) {
      // short-circuit
      return map
    }

    for (var i = 0; i < mappedSubSystems.length; ++i) {
      const mappedSubSystem = mappedSubSystems[i]
      if (limitLib && hasJsSubsystemChanges(filepathsChanged, mappedSubSystem)) {
        if (jsLabelCount.length >= 4) {
          for (const jsLabel of jsLabelCount) {
            delete map[jsLabel]
          }
          map['lib / src'] = true
          // short-circuit
          return map
        } else {
          jsLabelCount.push(mappedSubSystem)
        }
      }

      map[mappedSubSystem] = true
    }

    return map
  }, {})

  return Object.keys(labelsMap)
}

function hasJsSubsystemChanges (filepathsChanged, mappedSubSystem) {
  const hasLibChanges = filepathsChanged.some((filepath) => filepath.startsWith('lib/'))
  return hasLibChanges && jsSubsystemList.includes(mappedSubSystem)
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
