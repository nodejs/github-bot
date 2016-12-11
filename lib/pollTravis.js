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
function pollByCommitThenStatus (options) {
  githubClient.pullRequests.getCommits({
    owner: options.owner,
    repo: options.repo,
    number: options.pr
  }, (err, commitMetas) => {
    if (err) {
      return options.logger.error(err, 'Got error when retrieving GitHub commits for PR')
    }

    const lastCommitMeta = commitMetas.pop()
    const lastCommit = {
      sha: lastCommitMeta.sha,
      date: lastCommitMeta.commit.committer.date
    }

    const optsWithCommit = Object.assign({ lastCommit }, options)

    // attach last commit sha to all subsequent logs
    optsWithCommit.logger = options.logger.child({ commit: lastCommit.sha }, true)

    pollTravisBuildBySha(optsWithCommit)
    optsWithCommit.logger.info('Started polling Travis for build by commit')
  })
}

function pollTravisBuildBySha (options, checkNumber = 1) {
  const createGhStatus = createGhStatusFn(options)
  const toMatch = {
    sha: options.lastCommit.sha,
    date: options.lastCommit.date,
    pr: options.pr
  }

  if (checkNumber > 100) {
    options.logger.warn('Was not able to find matching build for PR, stopping poll now :(')
    return
  }

  travisClient.repos(options.owner, options.repo).builds.get((err, res) => {
    if (err) {
      return options.logger.error(err, 'Got error when retrieving Travis builds')
    }

    const matchingCommit = res.commits.find((commit) => {
      const matchesShaOrPr = commit.sha === toMatch.sha || commit.pull_request_number === toMatch.pr
      const matchesCommitDate = commit.committed_at === toMatch.date

      return matchesCommitDate && matchesShaOrPr
    })

    if (!matchingCommit) {
      options.logger.warn(`Travis hasn't picked up last commit yet, will do check #${checkNumber + 1} in 30 seconds`)
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
        options.logger.info(`"${lastState}" build found, will do check #${checkNumber + 1} in 30 seconds`)
        createGhStatus('pending', lastBuildForCommit.id, 'build in progress')
      } else {
        return options.logger.info(`Unknown build state: "${lastState}", stopping polling`)
      }
    } else {
      options.logger.warn(`Was not able to find matching build by last commit, will do check #${checkNumber + 1} in 30 seconds`)
    }

    setTimeout(pollTravisBuildBySha, 30 * 1000, options, checkNumber + 1)
  })
}

function createGhStatusFn (options) {
  return (state, travisId, message) => {
    githubClient.repos.createStatus({
      owner: options.owner,
      repo: options.repo,
      sha: options.lastCommit.sha,
      target_url: `https://travis-ci.org/${options.owner}/${options.repo}/builds/${travisId}`,
      context: 'Travis CI via nodejs-github-bot',
      state: state,
      description: message
    }, (err, res) => {
      if (err) {
        return options.logger.error(err, 'Error while updating GitHub PR status')
      }
      options.logger.info('Github PR status updated')
    })
  }
}
