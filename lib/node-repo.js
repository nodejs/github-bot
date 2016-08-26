'use strict'

const githubClient = require('./github-client')

const resolveLabels = require('./node-labels').resolveLabels

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
    updatePrWithLabels(options, resolveLabels(filepathsChanged))
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

exports.resolveLabelsThenUpdatePr = resolveLabelsThenUpdatePr
