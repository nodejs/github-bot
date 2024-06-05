'use strict'

/* eslint-disable camelcase */

const githubClient = require('./github-client')

async function removeLabelFromPR (options, label) {
  // no need to request github if we didn't resolve a label
  if (!label) {
    return
  }

  options.logger.debug('Trying to remove label: ' + label)

  try {
    await githubClient.issues.removeLabel({
      owner: options.owner,
      repo: options.repo,
      issue_number: options.prId,
      name: label
    })
  } catch (err) {
    if (err.code === 404) {
      options.logger.info('Label to remove did not exist, bailing ' + label)
      throw err
    }
    options.logger.error(err, 'Error while removing a label')
    throw err
  }

  options.logger.info('Removed a label ' + label)
  return label
}

function getBotPrLabels (options, cb) {
  githubClient.issues.listEvents({
    owner: options.owner,
    repo: options.repo,
    page: 1,
    per_page: 100, // we probably won't hit this
    issue_number: options.prId
  }).then(res => {
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
  }, cb)
}

exports.getBotPrLabels = getBotPrLabels
exports.removeLabelFromPR = removeLabelFromPR
