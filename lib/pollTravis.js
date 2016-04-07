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

function pollThenComment (owner, repoName, prId) {
  const prInfo = prInfoStr({ owner, repoName, prId })

  // we have to figure out what type of Travis polling we should perform,
  // either by PR #id (as for nodejs.org) or commit sha (for readable-stream)
  travisClient.repos(owner, repoName).builds.get((err, res) => {
    if (err) {
      return console.error(`! ${prInfo} Error while retrieving initial builds`, err.stack)
    }

    const hasAnyPrBuilds = res.builds.some((build) => build.pull_request)

    if (hasAnyPrBuilds) {
      pollByPrThenComment(owner, repoName, prId)
    } else {
      pollByCommitThenComment(owner, repoName, prId)
    }
  })
}

/**
 * When Travis CI picks up our PR's, we can poll and match builds
 * by their related PR #id.
 *
 * That's the case for nodejs.org.
 */
function pollByPrThenComment (owner, repoName, prId, checkNumber) {
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

    setTimeout(pollByPrThenComment, 30 * 1000, owner, repoName, prId, checkNumber + 1)
  })
}

/**
 * When Travis CI *doesn't* pick up our PR's, we have to poll and match builds
 * by the last commit SHA of the related PR.
 *
 * This is the case for readable-stream.
 */
function pollByCommitThenComment (owner, repoName, prId) {
  const prInfo = prInfoStr({ owner, repoName, prId })

  githubClient.pullRequests.getCommits({
    user: owner,
    repo: repoName,
    number: prId
  }, (err, commitMetas) => {
    if (err) {
      return console.error(`! ${prInfo} Got error when retrieving GitHub commits for PR`, err.stack)
    }

    const lastSha = commitMetas.pop().sha
    pollTravisBuildBySha({ owner, repoName, prId, lastSha })
    console.log(`* ${prInfo} Started polling Travis for build by commit ${lastSha.substr(0, 7)}`)
  })
}

function pollTravisBuildBySha (options, checkNumber) {
  const createGhComment = createGhCommentFn(options)
  const prInfo = prInfoStr(options)
  const shaToMatch = options.lastSha

  checkNumber = checkNumber || 1

  if (checkNumber > 100) {
    console.warn(`* ${prInfo} Was not able to find matching build for PR, stopping poll now :(`)
    return
  }

  travisClient.repos(options.owner, options.repoName).builds.get((err, res) => {
    if (err) {
      return console.error(`! ${prInfo} Got error when retrieving Travis builds`, err.stack)
    }

    const matchingCommit = res.commits.find((commit) => commit.sha === shaToMatch)
    if (!matchingCommit) {
      console.warn(`! ${prInfo} Travis hasn't picked up last commit yet, will do check #${checkNumber + 1} in 30 seconds`)
      return setTimeout(pollTravisBuildBySha, 30 * 1000, options, checkNumber + 1)
    }

    const lastBuildForCommit = res.builds.find((build) => build.commit_id === matchingCommit.id)
    if (lastBuildForCommit) {
      const lastState = lastBuildForCommit.state

      if (lastState === 'passed') {
        return createGhComment(`[Travis build passed](https://travis-ci.org/${options.owner}/${options.repoName}/builds/${lastBuildForCommit.id}) :+1:`)
      } else if (lastState === 'failed') {
        return createGhComment(`[Travis build failed](https://travis-ci.org/${options.owner}/${options.repoName}/builds/${lastBuildForCommit.id}) :-1:`)
      } else if (~['created', 'started'].indexOf(lastState)) {
        console.log(`* ${prInfo} "${lastState}" build found, will do check #${checkNumber + 1} in 30 seconds`)
      } else {
        return console.log(`* ${prInfo} Unknown build state: "${lastState}", stopping polling`)
      }
    } else {
      console.warn(`! ${prInfo} Was not able to find matching build by last commit, will do check #${checkNumber + 1} in 30 seconds`)
    }

    setTimeout(pollTravisBuildBySha, 30 * 1000, options, checkNumber + 1)
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
        return console.error(`! ${prInfo} Error while creating GitHub comment`, err.stack)
      }
      console.log(`* ${prInfo} Github comment created`)
    })
  }
}

function prInfoStr (options) {
  return `${options.owner}/${options.repoName}/#${options.prId}`
}

exports.pollThenComment = pollThenComment
