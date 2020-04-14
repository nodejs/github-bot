'use strict'

const url = require('url')
const { exec } = require('child_process')
const { readFile } = require('child_process')

const githubClient = require('./github-client')
const { createPrComment } = require('./github-comment')

function getCICommentPlaceholders(identifier, number) {
  return {
    status: `<!-- ${identifier}-status:${build.number} -->`,
    failure: `<!-- ${identifier}-failure:${build.number} -->`,
  }
}

function pushStarted (options, build, cb) {
  const pr = findPrInRef(build.ref)

  // create unique logger which is easily traceable for every subsequent log statement
  const traceFields = { pr, job: build.identifier, gitRef: build.ref, status: build.status }
  const logger = options.logger.child(traceFields, true)

  const optsWithPr = Object.assign({ pr }, options)

  if (build.status === 'pending') {
    switch (build.identifier) {
      case 'node-test-pull-request':
        const placeholders = getCICommentPlaceholders(build.identifier, build.number);
        const body = `CI: ${build.url} ${placeholder.status}

${placeholder.failure}`;
        createPrComment(Object.assign({ number: pr }, options), body)
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

    createGhStatus(statusOpts, logger, cb)
  })
}

function pushEnded (options, build, cb) {
  const pr = findPrInRef(build.ref)

  // create unique logger which is easily traceable for every subsequent log statement
  const traceFields = { pr, job: build.identifier, gitRef: build.ref, status: build.status }
  const logger = options.logger.child(traceFields, true)

  const optsWithPr = Object.assign({ pr }, options)

  if (build.identifier === 'node-test-pull-request') {
    const placeholders = getCICommentPlaceholders(build.identifier, build.number)

    // TODO(mmarchini): should call `cb` when all async operations here finish
    findBotCommentWithPlaceholderInPr(Object.assign({
      placeholder: placeholder.status
    }, optsWithPr), (err, comment) => {
      if (err) {
        logger.error(err, 'Got error when retrieving GitHub commits for PR')
        return
      }
      if (comment === null) {
        logger.info(err, "Couldn't find comment with placeholder")
      }

      // TODO(mmarchini): emojis?
      comment.body = comment.body.replace(placeholder.status, `[${build.status}]`);

      // TODO(mmarchini): does Jenkins return failure or failed?
      if (build.status.toLowerCase().startsWith('fail') && comment.body.includes(placeholder.failure)) {
        // TODO(mmarchini): move this to a separate file on lib
        // TODO(mmarchini): how to pass Jenkins authentication to ncu?
        // TODO(mmarchini): create proper tmpfile
        const tmpfile = `/tmp/${new Date()}-${build.number}.md`
        exec(`npx ncu-ci --markdown ${tmpfile} url ${build.url}`, (err, stdout, stderr) => {
          // TODO(mmarchini): cleanup tmpfile after use
          if (err) {
            logger.error(err, 'Got error when retrieving GitHub commits for PR')
            return
          }
          readFile(tmpfile, (err, data) => {
            if (err) {
              logger.error(err, 'Got error when retrieving GitHub commits for PR')
              return
            }
            comment.body = comment.body.replace(placeholder.failure, data)
            editGhComment(comment, logger, () => {})
          })
        })
      } else {
        editGhComment(comment, logger, () => {})
      }
    })
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
  githubClient.pullRequests.getCommits({
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

function findBotCommentWithPlaceholderInPr (options, cb, pageNumber = 1) {
  // Pull request comments are fetched via Issue Comments API
  githubClient.issues.getComments({
    owner: options.owner,
    repo: options.repo,
    number: options.pr,
    // TODO(mmarchini): use a more narrow date
    since: new Date('2020-01-01').ToISOString(),
    page: pageNumber,
    per_page: 100
  }, (err, res) => {
    if (err) {
      return cb(err)
    }

    for (const comment of (res.data || [])) {
      const user = comment.user
      const body = comment.body
      if (!user || !user.login || user.login !== 'nodejs-github-bot' || !body) continue

      if (!body.includes(placeholder)) {
        return cb(null, comment);
      }
    }

    const lastPageURL = githubClient.hasLastPage(res)
    if (lastPageURL) {
      return findBotCommentWithPlaceholderInPr(options, cb, pageNumber + 1)
    } else {
      return cb(null, null)
    }
  })
}

function createGhStatus (options, logger, cb) {
  githubClient.repos.createStatus({
    owner: options.owner,
    repo: options.repo,
    sha: options.sha,
    target_url: options.url,
    context: options.context,
    state: options.state,
    description: options.message
  }, (err, res) => {
    if (err) {
      logger.error(err, 'Error while updating Jenkins / GitHub PR status')
      cb(err)
      return
    }
    logger.info('Jenkins / Github PR status updated')
    cb(null)
  })
}

function editGhComment (options, logger, cb) {
  githubClient.repos.createStatus({
    owner: options.owner,
    repo: options.repo,
    id: options.id,
    body: options.body,
  }, (err, res) => {
    if (err) {
      logger.error(err, 'Error while updating GitHub PR Comment')
      cb(err)
      return
    }
    logger.info('GitHub PR Comment updated')
    cb(null)
  })
}

function validate (payload) {
  const isString = (param) => typeof (payload[param]) === 'string'
  return ['identifier', 'status', 'message', 'commit', 'url', 'number'].every(isString)
}

function pageNumberFromURL (githubUrl) {
  return url.parse(githubUrl, true).query.page
}

exports.validate = validate
exports.pushStarted = pushStarted
exports.pushEnded = pushEnded
exports.findLatestCommitInPr = findLatestCommitInPr
