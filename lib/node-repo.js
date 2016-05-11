'use strict'

const githubClient = require('./github-client')
const logger = require('./logger')

const resolveLabels = require('./node-labels').resolveLabels

function resolveLabelsThenUpdatePr (options) {
  githubClient.pullRequests.getFiles({
    user: options.owner,
    repo: options.repo,
    number: options.prId
  }, (err, res) => {
    if (err) {
      return logger.error(err, `! ${prInfoStr(options)} Error retrieving files`)
    }

    const filepathsChanged = res.map((fileMeta) => fileMeta.filename)
    updatePrWithLabels(options, resolveLabels(filepathsChanged))
  })
}

function updatePrWithLabels (options, labels) {
  // no need to request github if we didn't resolve any labels
  if (!labels.length) {
    return
  }

  fetchExistingLabels(options, (err, existingLabels) => {
    if (err) {
      return
    }

    const mergedLabels = labels.concat(existingLabels)

    githubClient.issues.edit({
      user: options.owner,
      repo: options.repo,
      number: options.prId,
      labels: mergedLabels
    }, (err) => {
      if (err) {
        return logger.error(err, `! ${prInfoStr(options)} Error while adding labels`)
      }

      logger.info(`* ${prInfoStr(options)} Added labels: ${labels}`)
    })
  })
}

function fetchExistingLabels (options, cb) {
  githubClient.issues.getIssueLabels({
    user: options.owner,
    repo: options.repo,
    number: options.prId
  }, (err, res) => {
    if (err) {
      logger.error(err, `! ${prInfoStr(options)} Error while fetching existing labels`)
      return cb(err)
    }

    const existingLabels = res.map((labelMeta) => labelMeta.name)
    cb(null, existingLabels)
  })
}

function prInfoStr (options) {
  return `${options.owner}/${options.repo}/#${options.prId}`
}

exports.resolveLabelsThenUpdatePr = resolveLabelsThenUpdatePr
