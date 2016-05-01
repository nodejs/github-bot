'use strict'

// order of entries in this map *does* matter for the resolved labels
const subSystemLabelsMap = {
  // don't want to label it a c++ update when we're "only" bumping the Node.js version
  'c++': /^src\/(?!node_version\.h)/,
  // meta is a very specific label for things that are policy and or meta-info related
  'meta': /^([A-Z]+$|CODE_OF_CONDUCT|ROADMAP|WORKING_GROUPS|GOVERNANCE|CHANGELOG|\.mail|\.git.+)/,
  // libuv needs an explicit mapping, as the ordinary /deps/ mapping below would
  // end up as libuv changes labeled with "uv" (which is a non-existing label)
  'libuv': /^deps\/uv\//,
  '$1': /^deps\/([^/]+)/
}

const exclusiveLabelsMap = {
  test: /^test\//,
  doc: /^doc\//,
  benchmark: /^benchmark\//
}

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
  return Object.keys(labelsMap).map((labelName) => {
    const rxForLabel = labelsMap[labelName]
    const matches = rxForLabel.exec(filepath)

    // return undefined when subsystem regex didn't match,
    // we'll filter out these values with the .filter() below
    if (matches === null) {
      return undefined
    }

    // label names starting with $ means we want to extract a matching
    // group from the regex we've just matched against
    if (labelName.startsWith('$')) {
      const wantedMatchGroup = labelName.substr(1)
      return matches[wantedMatchGroup]
    }

    // use label name as is when label doesn't look like a regex matching group
    return labelName
  }).filter(withoutUndefinedValues)[0]
}

function withoutUndefinedValues (label) {
  return label !== undefined
}

function matchesAnExclusiveLabel (filepath) {
  return mappedSubSystemForFile(exclusiveLabelsMap, filepath) !== undefined
}

exports.resolveLabels = resolveLabels
