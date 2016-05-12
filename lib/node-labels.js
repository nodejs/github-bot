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
  // libuv needs an explicit mapping, as the ordinary /deps/ mapping below would
  // end up as libuv changes labeled with "uv" (which is a non-existing label)
  [/^deps\/uv\//, 'libuv'],
  [/^deps\/([^/]+)/, '$1']
])

const exclusiveLabelsMap = new Map([
  [/^test\//, 'test'],
  [/^doc\//, 'doc'],
  [/^benchmark\//, 'benchmark']
])

function resolveLabels (filepathsChanged) {
  const exclusiveLabels = matchExclusiveSubSystem(filepathsChanged)

  return (exclusiveLabels.length > 0)
          ? exclusiveLabels
          : matchAllSubSystem(filepathsChanged)
}

function matchExclusiveSubSystem (filepathsChanged) {
  const isExclusive = filepathsChanged.every(matchesAnExclusiveLabel)
  const labels = matchSubSystemsByRegex(exclusiveLabelsMap, filepathsChanged)
  return (isExclusive && labels.length === 1) ? labels : []
}

function matchAllSubSystem (filepathsChanged) {
  return matchSubSystemsByRegex(subSystemLabelsMap, filepathsChanged)
}

function matchSubSystemsByRegex (rxLabelsMap, filepathsChanged) {
  // by putting matched labels into a map, we avoid duplicate labels
  const labelsMap = filepathsChanged.reduce((map, filepath) => {
    const mappedSubSystem = mappedSubSystemForFile(rxLabelsMap, filepath)

    if (mappedSubSystem) {
      map[mappedSubSystem] = true
    }

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
