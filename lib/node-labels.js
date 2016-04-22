'use strict'

const subSystemLabelsMap = {
  'c++': /^src\//
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
  const labels = matchSubSystemsByRegex(exclusiveLabelsMap, filepathsChanged)
  return labels.length === 1 ? labels : []
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
  return Object.keys(labelsMap).find((labelName) => {
    const rxForLabel = labelsMap[labelName]

    return rxForLabel.test(filepath) ? labelName : undefined
  })
}

exports.resolveLabels = resolveLabels
