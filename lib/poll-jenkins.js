'use strict'

const request = require('request')

const githubClient = require('./github-client')

const sixtySeconds = 60 * 1000;

function pollJenkins(options, checkNumber) {
  const url = `https://ci.nodejs.org/job/node-test-pull-request/${options.prId}/api/json`
  checkNumber = checkNumber || 1

  request({ url, json: true }, (err, response, data) => {
    const nextCheckNumber = checkNumber + 1

    if (!err) {
      const buildResult = data.result

      if (buildResult === 'SUCCESS') {
        console.log(`* ${prInfoStr(options)} CI build was a success`)
        return
      }
    }

    console.log(`* ${prInfoStr(options)} Build not finished yet, will do check #${checkNumber + 1} in one minute`)

    setTimeout(pollJenkins, sixtySeconds, prId, nextCheckNumber)
  })
}

function createGhStatusFn (options) {
  const prInfo = prInfoStr(options)

  return (state, travisId, message) => {
    const buildUrl = `https://ci.nodejs.org/job/node-test-pull-request/${options.prId}`

    githubClient.statuses.create({
      user: options.owner,
      repo: options.repoName,
      sha: options.lastCommit.sha,
      target_url: buildUrl,
      context: 'Jenkins CI via nodejs-github-bot',
      state: state,
      description: message
    }, (err, res) => {
      if (err) {
        return console.error(`! ${prInfo} Error while updating Jenkins / GitHub PR status`, err)
      }
      console.log(`* ${prInfo} Jenkins / Github PR status updated`)
    })
  }
}

function prInfoStr (options) {
  return `nodejs/node/#${options.prId}`
}

module.exports = pollJenkins
