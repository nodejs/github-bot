'use strict'

const GitHub = require('github')
const Travis = require('travis-ci')

const travisClient = new Travis({
  version: '2.0.0',
  access_token: process.env.TRAVIS_CI_TOKEN
})
const githubClient = new GitHub({
  version: '3.0.0',
  protocol: 'https',
  host: 'api.github.com',
  timeout: 5 * 1000,
  headers: {
    'user-agent': 'Node.js GitHub Bot v1.0-beta'
  }
})

githubClient.authenticate({
  type: 'oauth',
  token: process.env.GITHUB_TOKEN
})

function pollAndComment (owner, repoName, prId, checkNumber) {
  checkNumber = checkNumber || 1

  const prInfo = prInfoStr({ owner, repoName, prId })
  const createGhComment = createGhCommentFn({ owner, repoName, prId })

  if (checkNumber > 100) {
    console.warn(`* ${prInfo} Was not able to find matching build for PR, stopping poll now :(`)
    return
  }

  travisClient.repos(owner, repoName).builds.get((err, res) => {
    if (err) {
      return console.error(`! ${prInfo} Error while retrieving builds`, err.stack)
    }

    const lastBuildForPr = res.builds.find((build) => build.pull_request_number === prId)

    if (lastBuildForPr) {
      const lastState = lastBuildForPr.state

      if (lastState === 'passed') {
        return createGhComment(`[Travis build passed](https://travis-ci.org/${owner}/${repoName}/builds/${lastBuildForPr.id}) :+1:`)
      } else if (lastState === 'failed') {
        return createGhComment(`[Travis build failed](https://travis-ci.org/${owner}/${repoName}/builds/${lastBuildForPr.id}) :-1:`)
      } else if (~['created', 'started'].indexOf(lastState)) {
        console.log(`* ${prInfo} "${lastState}" build found, will do check #${checkNumber + 1} in 30 seconds`)
      } else {
        return console.log(`* ${prInfo} Unknown build state: "${lastState}", stopping polling`)
      }
    } else {
      console.warn(`! ${prInfo} Was not able to find matching build, will do check #${checkNumber + 1} in 30 seconds`)
    }

    setTimeout(pollAndComment, 30 * 1000, owner, repoName, prId, checkNumber + 1)
  })
}

function createGhCommentFn (options) {
  const prInfo = prInfoStr(options)

  return (message, cb) => {
    githubClient.issues.createComment({
      user: options.owner,
      repo: options.repoName,
      number: options.prId,
      body: message
    }, (err, res) => {
      if (err) {
        return console.error(`! ${prInfo} Error from GitHub`, err.stack)
      }
      console.log(`* ${prInfo} Github comment created`)
    })
  }
}

function prInfoStr (options) {
  return `${options.owner}/${options.repoName}/#${options.prId}`
}

exports.pollAndComment = pollAndComment
