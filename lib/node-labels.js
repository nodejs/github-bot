'use strict'

// order of entries in this map *does* matter for the resolved labels
// earlier entries override later entries
const subSystemLabelsMap = new Map([
  // don't want to label it a c++ update when we're "only" bumping the Node.js version
  [/^src\/(?!node_version\.h)/, 'c++'],
  // meta is a very specific label for things that are policy and or meta-info related
  [/^([A-Z]+$|CODE_OF_CONDUCT|ROADMAP|WORKING_GROUPS|GOVERNANCE|CHANGELOG|\.mail|\.git.+)/, 'meta'],
  // things that edit top-level .md files are always a doc change
  [/^\w+\.md$/, 'doc'],

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
  [/^doc\//, 'doc'],
  [/^benchmark\//, 'benchmark']
])

function resolveLabels (filepathsChanged, limitLib = true) {
  const exclusiveLabels = matchExclusiveSubSystem(filepathsChanged)

  return (exclusiveLabels.length > 0)
          ? exclusiveLabels
          : matchAllSubSystem(filepathsChanged, limitLib)
}

function matchExclusiveSubSystem (filepathsChanged) {
  const isExclusive = filepathsChanged.every(matchesAnExclusiveLabel)
  const labels = matchSubSystemsByRegex(exclusiveLabelsMap, filepathsChanged)
  return (isExclusive && labels.length === 1) ? labels : []
}

function matchAllSubSystem (filepathsChanged, limitLib) {
  return matchSubSystemsByRegex(
      subSystemLabelsMap, filepathsChanged, limitLib)
}

function matchSubSystemsByRegex (rxLabelsMap, filepathsChanged, limitLib) {
  const jsLabelCount = []
  // by putting matched labels into a map, we avoid duplicate labels
  const labelsMap = filepathsChanged.reduce((map, filepath) => {
    const mappedSubSystem = mappedSubSystemForFile(rxLabelsMap, filepath)

    if (!mappedSubSystem) {
      // short-circuit
      return map
    }

    if (limitLib && jsSubsystemList.includes(mappedSubSystem)) {
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

    return map
  }, {})

  return Object.keys(labelsMap)
}

function mappedSubSystemForFile (labelsMap, filepath) {
  for (const [regex, label] of labelsMap) {
    const matches = regex.exec(filepath)

    if (matches === null) {
      continue
    }

    // label names starting with $ means we want to extract a matching
    // group from the regex we've just matched against
    if (label.startsWith('$')) {
      const wantedMatchGroup = label.substr(1)
      return matches[wantedMatchGroup]
    }

    // use label name as is when label doesn't look like a regex matching group
    return label
  }
}

function matchesAnExclusiveLabel (filepath) {
  return mappedSubSystemForFile(exclusiveLabelsMap, filepath) !== undefined
}

exports.resolveLabels = resolveLabels
