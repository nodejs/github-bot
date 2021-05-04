'use strict'

/* eslint-disable camelcase */

const Aigle = require('aigle')
const request = require('request')

const githubClient = require('./github-client')
const { createPrComment } = require('./github-comment')
const { Owners } = require('./node-owners')

const fiveSeconds = 5 * 1000

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

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

async function deferredResolveOwnersThenPingPr (options) {
  const timeoutMillis = (options.timeoutInSec || 0) * 1000
  await sleep(timeoutMillis)
  return resolveOwnersThenPingPr(options)
}

function getCodeOwnersUrl (owner, repo, defaultBranch) {
  const base = 'raw.githubusercontent.com'
  const filepath = '.github/CODEOWNERS'
  return `https://${base}/${owner}/${repo}/${defaultBranch}/${filepath}`
}

async function listFiles ({ owner, repo, prId, logger }) {
  try {
    const response = await githubClient.pulls.listFiles({
      owner,
      repo,
      pull_number: prId
    })
    return response.data.map(({ filename }) => filename)
  } catch (err) {
    logger.error(err, 'Error retrieving files from GitHub')
    throw err
  }
}

async function getDefaultBranch ({ owner, repo, logger }) {
  try {
    const data = (await githubClient.repos.get({ owner, repo })).data || { }

    if (!data['default_branch']) {
      logger.error(null, 'Could not determine default branch')
      throw new Error('unknown default branch')
    }

    return data.default_branch
  } catch (err) {
    logger.error(err, 'Error retrieving repository data')
    throw err
  }
}

function getCodeOwnersFile (url, { logger }) {
  return new Promise((resolve, reject) => {
    request(url, (err, res, body) => {
      if (err || res.statusCode !== 200) {
        logger.error(err, 'Error retrieving OWNERS')
        return reject(err)
      }
      return resolve(body)
    })
  })
}

async function resolveOwnersThenPingPr (options) {
  const { owner, repo } = options
  const times = options.retries || 5
  const interval = options.retryInterval || fiveSeconds
  const retry = fn => Aigle.retry({ times, interval }, fn)

  options.logger.debug('Getting file paths')
  const filepathsChanged = await retry(() => listFiles(options))
  options.logger = options.logger.child({ filepathsChanged })

  options.logger.debug('Getting default branch')
  const defaultBranch = await retry(() => getDefaultBranch(options))

  const url = getCodeOwnersUrl(owner, repo, defaultBranch)
  options.logger = options.logger.child({ codeownersUrl: url })

  options.logger.debug(`Fetching OWNERS`)
  const file = await retry(() => getCodeOwnersFile(url, options))

  const owners = Owners.fromFile(file)
  const selectedOwners = owners.getOwnersForPaths(filepathsChanged)
  options.logger = options.logger.child({ owners: selectedOwners })

  options.logger.debug('Codeowners file parsed')
  if (selectedOwners.length > 0) {
    await pingOwners(options, selectedOwners)
  }
}

function getCommentForOwners (owners) {
  return `Review requested:\n\n${owners.map(i => `- [ ] ${i}`).join('\n')}`
}

async function pingOwners (options, owners) {
  options.logger.debug('Pinging codeowners')
  try {
    await createPrComment({
      owner: options.owner,
      repo: options.repo,
      issue_number: options.prId,
      logger: options.logger
    }, getCommentForOwners(owners))
  } catch (err) {
    options.logger.error(err, 'Error while pinging owners')
    throw err
  }
  options.logger.debug('Owners pinged successfully')
}

exports.getBotPrLabels = getBotPrLabels
exports.removeLabelFromPR = removeLabelFromPR
exports.resolveOwnersThenPingPr = deferredResolveOwnersThenPingPr

// exposed for testability
exports._testExports = {
  pingOwners, getCodeOwnersFile, getCodeOwnersUrl, getDefaultBranch, listFiles, getCommentForOwners
}
