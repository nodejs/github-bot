'use strict'

const LRU = require('lru-cache')

const githubClient = require('./github-client')
const resolveLabels = require('./node-labels').resolveLabels
const existingLabelsCache = new LRU({ max: 1, maxAge: 1000 * 60 * 60 })

function deferredResolveLabelsThenUpdatePr (options) {
  const timeoutMillis = (options.timeoutInSec || 0) * 1000
  setTimeout(resolveLabelsThenUpdatePr, timeoutMillis, options)
}

function resolveLabelsThenUpdatePr (options) {
  options.logger.debug('Fetching PR files for labelling')

  githubClient.pullRequests.getFiles({
    user: options.owner,
    repo: options.repo,
    number: options.prId
  }, (err, res) => {
    if (err) {
      return options.logger.error(err, 'Error retrieving files from GitHub')
    }

    const filepathsChanged = res.map((fileMeta) => fileMeta.filename)
    const resolvedLabels = resolveLabels(filepathsChanged, options.baseBranch)

    fetchExistingLabels(options, (err, existingLabels) => {
      if (err) {
        return options.logger.error(err, 'Error retrieving existing repo labels')
      }

      const labelsToAdd = stringsInCommon(existingLabels, resolvedLabels)
      options.logger.debug('Resolved labels: ' + labelsToAdd)

      updatePrWithLabels(options, labelsToAdd)
    })
  })
}

function updatePrWithLabels (options, labels) {
  // no need to request github if we didn't resolve any labels
  if (!labels.length) {
    return
  }

  options.logger.debug('Trying to add labels: ' + labels)

  githubClient.issues.addLabels({
    user: options.owner,
    repo: options.repo,
    number: options.prId,
    body: labels
  }, (err) => {
    if (err) {
      return options.logger.error(err, 'Error while adding labels')
    }

    options.logger.info('Added labels: ' + labels)
  })
}

function removeLabelFromPR (options, label) {
  // no need to request github if we didn't resolve a label
  if (!label) {
    return
  }

  options.logger.debug('Trying to remove label: ' + label)

  githubClient.issues.removeLabel({
    user: options.owner,
    repo: options.repo,
    number: options.prId,
    name: label
  }, (err) => {
    if (err) {
      if (err.code === 404) return options.logger.info('Label to remove did not exist, bailing ' + label)

      return options.logger.error(err, 'Error while removing a label')
    }

    options.logger.info('Removed a label ' + label)
  })
}

function fetchExistingLabels (options, cb) {
  const cacheKey = `${options.owner}:${options.repo}`

  if (existingLabelsCache.has(cacheKey)) {
    return cb(null, existingLabelsCache.get(cacheKey))
  }

  // the github client API is somewhat misleading,
  // this fetches *all* repo labels not just for an issue
  githubClient.issues.getLabels({
    user: options.owner,
    repo: options.repo,
    per_page: 100
  }, (err, existingLabels) => {
    if (err) {
      return cb(err)
    }

    const existingLabelNames = existingLabels.map((label) => label.name)

    // cache labels so we don't have to fetch these *all the time*
    existingLabelsCache.set(cacheKey, existingLabelNames)
    options.logger.debug('Filled existing repo labels cache: ' + existingLabelNames)

    cb(null, existingLabelNames)
  })
}

function stringsInCommon (arr1, arr2) {
  const loweredArr2 = arr2.map((str) => str.toLowerCase())
  // we want the original string cases in arr1, therefore we don't lowercase them
  // before comparing them cause that would wrongly make "V8" -> "v8"
  return arr1.filter((str) => loweredArr2.indexOf(str.toLowerCase()) !== -1)
}

exports.removeLabelFromPR = removeLabelFromPR
exports.updatePrWithLabels = updatePrWithLabels
exports.resolveLabelsThenUpdatePr = deferredResolveLabelsThenUpdatePr

// exposed for testability
exports._fetchExistingLabels = fetchExistingLabels
