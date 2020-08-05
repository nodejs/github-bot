'use strict'

const LRU = require('lru-cache')
const retry = require('async').retry

const githubClient = require('./github-client')
const resolveLabels = require('./node-labels').resolveLabels
const existingLabelsCache = new LRU({ max: 1, maxAge: 1000 * 60 * 60 })

const fiveSeconds = 5 * 1000

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

async function deferredResolveLabelsThenUpdatePr (options) {
  const timeoutMillis = (options.timeoutInSec || 0) * 1000
  await sleep(timeoutMillis)
  return resolveLabelsThenUpdatePr(options)
}

function resolveLabelsThenUpdatePr (options) {
  options.logger.debug('Fetching PR files for labelling')

  const listFiles = (cb) => {
    githubClient.pullRequests.listFiles({
      owner: options.owner,
      repo: options.repo,
      number: options.prId
    }, cb)
  }

  return new Promise((resolve, reject) => {
    retry({ times: 5, interval: fiveSeconds }, listFiles, (err, res) => {
      if (err) {
        options.logger.error(err, 'Error retrieving files from GitHub')
        return reject(err)
      }

      const filepathsChanged = res.data.map((fileMeta) => fileMeta.filename)
      const resolvedLabels = resolveLabels(filepathsChanged, options.baseBranch)

      resolve(fetchExistingThenUpdatePr(options, resolvedLabels))
    })
  })
}

async function fetchExistingThenUpdatePr (options, labels) {
  try {
    const existingLabels = await fetchExistingLabels(options)
    const labelsToAdd = stringsInCommon(existingLabels, labels)
    options.logger.debug('Resolved labels: ' + labelsToAdd, labels, existingLabels)

    return updatePrWithLabels(options, labelsToAdd)
  } catch (err) {
    options.logger.error(err, 'Error retrieving existing repo labels')

    return updatePrWithLabels(options, labels)
  }
}

async function updatePrWithLabels (options, labels) {
  // no need to request github if we didn't resolve any labels
  if (!labels.length) {
    return
  }

  options.logger.debug('Trying to add labels: ' + labels)

  try {
    await githubClient.issues.addLabels({
      owner: options.owner,
      repo: options.repo,
      number: options.prId,
      labels: labels
    })

    options.logger.info('Added labels: ' + labels)
  } catch (err) {
    options.logger.error(err, 'Error while adding labels')
  }
}

function removeLabelFromPR (options, label) {
  // no need to request github if we didn't resolve a label
  if (!label) {
    return
  }

  options.logger.debug('Trying to remove label: ' + label)

  githubClient.issues.removeLabel({
    owner: options.owner,
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

async function fetchExistingLabels (options) {
  const cacheKey = `${options.owner}:${options.repo}`

  if (existingLabelsCache.has(cacheKey)) {
    return existingLabelsCache.get(cacheKey)
  }

  const labelsResult = await fetchLabelPages(options, 1)
  const existingLabels = labelsResult.data || labelsResult || []
  const existingLabelNames = existingLabels.map((label) => label.name)

  // cache labels so we don't have to fetch these *all the time*
  existingLabelsCache.set(cacheKey, existingLabelNames)
  options.logger.debug('Filled existing repo labels cache: ' + existingLabelNames)

  return existingLabelNames
}

async function fetchLabelPages (options, startPageNum, cb) {
  // the github client API is somewhat misleading,
  // this fetches *all* repo labels not just for an issue
  const result = await githubClient.issues.listLabelsForRepo({
    owner: options.owner,
    repo: options.repo,
    page: startPageNum,
    per_page: 100
  })

  const existingLabels = result.data || []
  if (!githubClient.hasNextPage(result)) {
    return existingLabels
  }

  const remainingLabels = await fetchLabelPages(
    options,
    startPageNum + 1)

  return existingLabels.concat(remainingLabels)
}

function getBotPrLabels (options, cb) {
  githubClient.issues.getEvents({
    owner: options.owner,
    repo: options.repo,
    page: 1,
    per_page: 100, // we probably won't hit this
    issue_number: options.prId
  }, (err, res) => {
    if (err) {
      return cb(err)
    }

    const events = res.data || []
    const ourLabels = []

    for (const event of events) {
      if (event.event === 'unlabeled') {
        const index = ourLabels.indexOf(event.label.name)
        if (index === -1) continue

        ourLabels.splice(index, 1)
      } else if (event.event === 'labeled') {
        const index = ourLabels.indexOf(event.label.name)
        if (index > -1) continue

        if (event.actor.login === 'nodejs-github-bot') {
          ourLabels.push(event.label.name)
        }
      }
    }

    cb(null, ourLabels)
  })
}

function stringsInCommon (arr1, arr2) {
  const loweredArr2 = arr2.map((str) => str.toLowerCase())
  // we want the original string cases in arr1, therefore we don't lowercase them
  // before comparing them cause that would wrongly make "V8" -> "v8"
  return arr1.filter((str) => loweredArr2.indexOf(str.toLowerCase()) !== -1)
}

exports.getBotPrLabels = getBotPrLabels
exports.removeLabelFromPR = removeLabelFromPR
exports.fetchExistingThenUpdatePr = fetchExistingThenUpdatePr
exports.resolveLabelsThenUpdatePr = deferredResolveLabelsThenUpdatePr

// exposed for testability
exports._fetchExistingLabels = fetchExistingLabels
