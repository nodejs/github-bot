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

    fetchExistingLabels(options, (existingLabels) => {
      const labelsToAdd = itemsInCommon(existingLabels, resolvedLabels)

      updatePrWithLabels(options, labelsToAdd)
    })
  })
}

function updatePrWithLabels (options, labels) {
  // no need to request github if we didn't resolve any labels
  if (!labels.length) {
    return
  }

  githubClient.issues.addLabels({
    user: options.owner,
    repo: options.repo,
    number: options.prId,
    body: labels
  }, (err) => {
    if (err) {
      return options.logger.error(err, 'Error while editing issue to add labels')
    }

    options.logger.info(`Added labels: ${labels}`)
  })
}

function fetchExistingLabels (options, cb) {
  const cacheKey = `${options.owner}:${options.repo}`

  if (existingLabelsCache.has(cacheKey)) {
    return cb(existingLabelsCache.get(cacheKey))
  }

  // the github client API is somewhat misleading,
  // this fetches *all* repo labels not just for an issue
  githubClient.issues.getLabels({
    user: options.owner,
    repo: options.repo
  }, (err, existingLabels) => {
    if (err) {
      return options.logger.error(err, 'Error retrieving existing repo labels from GitHub')
    }

    // cache labels so we don't have to fetch these *all the time*
    existingLabelsCache.set(cacheKey, existingLabels)

    cb(existingLabels)
  })
}

function itemsInCommon (arr1, arr2) {
  return arr1.filter((item) => arr2.indexOf(item) !== -1)
}

exports.resolveLabelsThenUpdatePr = deferredResolveLabelsThenUpdatePr

// exposed for testability
exports._fetchExistingLabels = fetchExistingLabels
