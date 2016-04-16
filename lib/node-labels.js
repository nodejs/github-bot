'use strict'

const subSystemLabels = {
  'c++': /^src\//
}

const rxTests = /^test\//

function resolveLabels (filepathsChanged) {
  if (isOnly(rxTests, filepathsChanged)) {
    return ['test']
  }

  return matchBySubSystemRegex(filepathsChanged)
}

function isOnly (regexToMatch, filepathsChanged) {
  return filepathsChanged.every((filepath) => regexToMatch.test(filepath))
}

function matchBySubSystemRegex (filepathsChanged) {
  // by putting matched labels into a map, we avoid duplicate labels
  const labelsMap = filepathsChanged.reduce((map, filepath) => {
    const mappedSubSystem = mappedSubSystemForFile(filepath)

    if (mappedSubSystem) {
      map[mappedSubSystem] = true
    }

    return map
  }, {})

  return Object.keys(labelsMap)
}

function mappedSubSystemForFile (filepath) {
  return Object.keys(subSystemLabels).find((labelName) => {
    const rxForLabel = subSystemLabels[labelName]

    return rxForLabel.test(filepath) ? labelName : undefined
  })
}

exports.resolveLabels = resolveLabels
