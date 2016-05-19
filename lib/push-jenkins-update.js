'use strict'

const githubClient = require('./github-client')

function push (options, build) {
  // create unique logger which is easily traceable for every subsequent log statement
  const traceFields = { commit: build.commit, job: build.identifier, status: build.status }
  const logger = options.logger.child(traceFields, true)

  const statusOpts = Object.assign({
    sha: build.commit,
    url: build.url,
    context: build.identifier,
    state: build.status,
    message: build.message
  }, options)

  createGhStatus(statusOpts, logger)
}

function createGhStatus (options, logger) {
  githubClient.statuses.create({
    user: options.owner,
    repo: options.repo,
    sha: options.sha,
    target_url: options.url,
    context: options.context,
    state: options.state,
    description: options.message
  }, (err, res) => {
    if (err) {
      return logger.error(err, 'Error while updating Jenkins / GitHub PR status')
    }
    logger.info('Jenkins / Github PR status updated')
  })
}

function validate (payload) {
  const isString = (param) => typeof (payload[param]) === 'string'
  return ['identifier', 'status', 'message', 'commit', 'url'].every(isString)
}

exports.validate = validate
exports.push = push
