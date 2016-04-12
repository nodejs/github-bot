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

exports.pollThenStatus = pollByCommitThenStatus

/**
 * Poll and match builds by the last commit SHA of the related PR.
 */
function pollByCommitThenStatus (owner, repoName, prId) {
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
  const createGhStatus = createGhStatusFn(options)
  const prInfo = prInfoStr(options)
  const shaToMatch = options.lastSha
  const prToMatch = options.prId

  checkNumber = checkNumber || 1

  if (checkNumber > 100) {
    console.warn(`* ${prInfo} Was not able to find matching build for PR, stopping poll now :(`)
    return
  }

  travisClient.repos(options.owner, options.repoName).builds.get((err, res) => {
    if (err) {
      return console.error(`! ${prInfo} Got error when retrieving Travis builds`, err.stack)
    }

    const matchingCommit = res.commits.find((commit) => {
      return commit.sha === shaToMatch || commit.pull_request_number === prToMatch
    })
    if (!matchingCommit) {
      console.warn(`! ${prInfo} Travis hasn't picked up last commit yet, will do check #${checkNumber + 1} in 30 seconds`)
      return setTimeout(pollTravisBuildBySha, 30 * 1000, options, checkNumber + 1)
    }

    const lastBuildForCommit = res.builds.find((build) => build.commit_id === matchingCommit.id)
    if (lastBuildForCommit) {
      const lastState = lastBuildForCommit.state

      if (lastState === 'passed') {
        return createGhStatus('success', lastBuildForCommit.id, 'all tests passed')
      } else if (lastState === 'failed') {
        return createGhStatus('failure', lastBuildForCommit.id, 'build failure')
      } else if (~['created', 'started'].indexOf(lastState)) {
        console.log(`* ${prInfo} "${lastState}" build found, will do check #${checkNumber + 1} in 30 seconds`)
        createGhStatus('pending', lastBuildForCommit.id, 'build in progress')
      } else {
        return console.log(`* ${prInfo} Unknown build state: "${lastState}", stopping polling`)
      }
    } else {
      console.warn(`! ${prInfo} Was not able to find matching build by last commit, will do check #${checkNumber + 1} in 30 seconds`)
    }

    setTimeout(pollTravisBuildBySha, 30 * 1000, options, checkNumber + 1)
  })
}

function createGhStatusFn (options) {
  const prInfo = prInfoStr(options)

  return (state, travisId, message) => {
    githubClient.statuses.create({
      user: options.owner,
      repo: options.repoName,
      sha: options.lastSha,
      target_url: `https://travis-ci.org/${options.owner}/${options.repoName}/builds/${travisId}`,
      context: 'Travis CI via nodejs-github-bot',
      state: state,
      description: message
    }, (err, res) => {
      if (err) {
        return console.error(`! ${prInfo} Error while updating GitHub PR status`, err.stack)
      }
      console.log(`* ${prInfo} Github PR status updated`)
    })
  }
}

function prInfoStr (options) {
  return `${options.owner}/${options.repoName}/#${options.prId}`
}
