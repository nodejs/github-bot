'use strict'

const url = require('url')

const githubClient = require('./github-client')
const { createPrComment } = require('./github-comment')

function pushStarted (options, build, cb) {
  const pr = findPrInRef(build.ref)

  // create unique logger which is easily traceable for every subsequent log statement
  const traceFields = { pr, job: build.identifier, gitRef: build.ref, status: build.status }
  const logger = options.logger.child(traceFields, true)

  const optsWithPr = Object.assign({ pr }, options)

  if (build.status === 'pending') {
    switch (build.identifier) {
      case 'node-test-pull-request':
        createPrComment(Object.assign({ number: pr }, options), `CI: ${build.url}`)
        break

      case 'node-test-pull-request-lite-pipeline':
        createPrComment(Object.assign({ number: pr }, options), `Lite-CI: ${build.url}`)
        break

      default:
        break
    }
  }

  findLatestCommitInPr(optsWithPr, (err, latestCommit) => {
    if (err) {
      logger.error(err, 'Got error when retrieving GitHub commits for PR')
      cb(err)
      return
    }

    const statusOpts = Object.assign({
      sha: latestCommit.sha,
      url: build.url,
      context: build.identifier,
      state: build.status,
      message: build.message || 'running tests'
    }, options)

    createGhStatus(statusOpts, logger).then(cb).catch(cb)
  })
}

function pushEnded (options, build, cb) {
  const pr = findPrInRef(build.ref)

  // create unique logger which is easily traceable for every subsequent log statement
  const traceFields = { pr, job: build.identifier, gitRef: build.ref, status: build.status }
  const logger = options.logger.child(traceFields, true)

  const optsWithPr = Object.assign({ pr }, options)

  findLatestCommitInPr(optsWithPr, (err, latestCommit) => {
    if (err) {
      logger.error(err, 'Got error when retrieving GitHub commits for PR')
      cb(err)
      return
    }

    const statusOpts = Object.assign({
      sha: latestCommit.sha,
      url: build.url,
      context: build.identifier,
      state: build.status,
      message: build.message || 'all tests passed'
    }, options)

    createGhStatus(statusOpts, logger, cb)
  })
}

function findPrInRef (gitRef) {
  // refs/pull/12345/head
  return parseInt(gitRef.split('/')[2], 10)
}

function findLatestCommitInPr (options, cb, pageNumber = 1) {
  githubClient.pullRequests.listCommits({
    owner: options.owner,
    repo: options.repo,
    number: options.pr,
    page: pageNumber,
    per_page: 100
  }, (err, res) => {
    if (err) {
      return cb(err)
    }

    const commitMetas = res.data || []
    const lastPageURL = githubClient.hasLastPage(res)
    if (lastPageURL) {
      return findLatestCommitInPr(options, cb, pageNumberFromURL(lastPageURL))
    }

    const lastCommitMeta = commitMetas.pop()
    const lastCommit = {
      sha: lastCommitMeta.sha,
      date: lastCommitMeta.commit.committer.date
    }

    cb(null, lastCommit)
  })
}

async function createGhStatus (options, logger) {
  try {
    await githubClient.repos.createStatus({
      owner: options.owner,
      repo: options.repo,
      sha: options.sha,
      target_url: options.url,
      context: options.context,
      state: options.state,
      description: options.message
    })
  } catch (err) {
    logger.error(err, 'Error while updating Jenkins / GitHub PR status')
    throw err
  }
  logger.info('Jenkins / Github PR status updated')
}

function validate (payload) {
  const isString = (param) => typeof (payload[param]) === 'string'
  return ['identifier', 'status', 'message', 'commit', 'url'].every(isString)
}

function pageNumberFromURL (githubUrl) {
  return url.parse(githubUrl, true).query.page
}

exports.validate = validate
exports.pushStarted = pushStarted
exports.pushEnded = pushEnded
exports.findLatestCommitInPr = findLatestCommitInPr
