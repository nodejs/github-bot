'use strict'

const githubClient = require('./github-client')

exports.createPrComment = function createPrComment ({ owner, repo, number, logger }, body) {
  githubClient.issues.createComment({
    owner,
    repo,
    number,
    body
  }, (err) => {
    if (err) {
      logger.error(err, 'Error while creating comment on GitHub')
    }
  })
}
