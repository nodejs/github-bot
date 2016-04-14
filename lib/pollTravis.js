'use strict'

const Travis = require('travis-ci')

const githubClient = require('./github-client')

const travisClient = new Travis({
  version: '2.0.0',
  access_token: process.env.TRAVIS_CI_TOKEN
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

    const lastCommitMeta = commitMetas.pop()
    const lastCommit = {
      sha: lastCommitMeta.sha,
      date: lastCommitMeta.commit.committer.date
    }

    pollTravisBuildBySha({ owner, repoName, prId, lastCommit })
    console.log(`* ${prInfo} Started polling Travis for build by commit ${lastCommit.sha.substr(0, 7)}`)
  })
}

function pollTravisBuildBySha (options, checkNumber) {
  const createGhStatus = createGhStatusFn(options)
  const prInfo = prInfoStr(options)
  const toMatch = {
    sha: options.lastCommit.sha,
    date: options.lastCommit.date,
    prId: options.prId
  }

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
      const matchesShaOrPr = commit.sha === toMatch.sha || commit.pull_request_number === toMatch.prId
      const matchesCommitDate = commit.committed_at === toMatch.date

      return matchesCommitDate && matchesShaOrPr
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
      sha: options.lastCommit.sha,
      target_url: `https://travis-ci.org/${options.owner}/${options.repoName}/builds/${travisId}`,
      context: 'Travis CI via nodejs-github-bot',
      state: state,
      description: message
    }, (err, res) => {
      if (err) {
        return console.error(`! ${prInfo} Error while updating GitHub PR status`, err)
      }
      console.log(`* ${prInfo} Github PR status updated`)
    })
  }
}

function prInfoStr (options) {
  return `${options.owner}/${options.repoName}/#${options.prId}`
}
