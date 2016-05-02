'use strict'

const request = require('request')

const githubClient = require('./github-client')

const sixtySeconds = 60 * 1000
const jenkinsToGhStatusMap = {
  'SUCCESS': {
    state: 'success',
    message: 'all tests passed'
  },
  'FAILURE': {
    state: 'failure',
    message: 'build failure'
  },
  'ABORTED': {
    state: 'error',
    message: 'build aborted'
  },
  'UNSTABLE': {
    state: 'error',
    message: 'build unstable'
  }
}

/**
 * NOTES TO SELF:
 *
 * Jenkins build could be matched by related PR by filtering on build parameters:
 *  request -> build.actions.find(parameters !== undefined).filter({ name: 'PR_ID' && value: <INSERT-PR-ID-HERE> })
 *  example response: https://ci.nodejs.org/job/node-test-pull-request/2460/api/json
 */

function pollJenkins (options, checkNumber) {
  const url = `https://ci.nodejs.org/job/node-test-pull-request/${options.prId}/api/json`
  checkNumber = checkNumber || 1

  // we should probably not poll forever .. lets stop after 420 polls (7 hours)
  if (checkNumber >= 420) {
    return console.warn(`* ${prInfoStr(options)} Wasn't able to a conclusive build result, stopping poll now :(`)
  }

  request({ url, json: true }, (err, response, build) => {
    const nextCheckNumber = checkNumber + 1

    if (err) {
      console.error(`* ${prInfoStr(options)} Error when requesting Jenkins API, will do check #${checkNumber + 1} in one minute. Error: ${err}`)
      return setTimeout(pollJenkins, sixtySeconds, options, nextCheckNumber)
    }

    if (response.statusCode === 404) {
      console.log(`* ${prInfoStr(options)} Jenkins build not found yet, will do check #${checkNumber + 1} in one minute`)
      return setTimeout(pollJenkins, sixtySeconds, options, nextCheckNumber)
    }

    // we should have enough data to push a github status update
    const buildResult = build.result
    const isFinished = buildResult !== null
    const optsWithSha = extendWithLastCommitSha(options, build)
    const createGhStatus = createGhStatusFn(optsWithSha)

    const matchedGhStatus = jenkinsToGhStatusMap[buildResult]

    if (matchedGhStatus) {
      return createGhStatus(matchedGhStatus.state, matchedGhStatus.message)
    } else if (isFinished) {
      return console.error(`! ${prInfoStr(options)} Unknown Jenkins build result '${buildResult}', aborting poll for this PR`)
    }

    // as build isn't finished yet, we'll have to keep polling Jenkins for new build status
    console.log(`* ${prInfoStr(options)} Build not finished yet, will do check #${checkNumber + 1} in one minute`)
    createGhStatus('pending', 'build in progress')

    setTimeout(pollJenkins, sixtySeconds, options, nextCheckNumber)
  })
}

function createGhStatusFn (options) {
  const prInfo = prInfoStr(options)

  return (state, message) => {
    const buildUrl = `https://ci.nodejs.org/job/node-test-pull-request/${options.prId}`

    githubClient.statuses.create({
      user: options.owner,
      repo: options.repoName,
      sha: options.sha,
      target_url: buildUrl,
      context: 'Jenkins CI via nodejs-github-bot',
      state: state,
      description: message
    }, (err, res) => {
      if (err) {
        return console.error(`! ${prInfo} Error while updating Jenkins / GitHub PR status`, err)
      }
      console.log(`* ${prInfo} Jenkins / Github PR status updated to '${state}'`)
    })
  }
}

function extendWithLastCommitSha (options, build) {
  const lastChangeSet = build.changeSet.items[0]

  return Object.assign({
    sha: lastChangeSet.commitId
  }, options)
}

function prInfoStr (options) {
  return `nodejs/node/#${options.prId}`
}

module.exports = pollJenkins
