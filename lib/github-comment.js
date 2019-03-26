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

exports.editPrComment = function createPrComment ({ owner, repo, logger }, commentId, body) {
  githubClient.issues.editComment({
    owner,
    repo,
    id: commentId,
    body
  }, (err) => {
    if (err) {
      logger.error(err, 'Error while editing comment on GitHub')
    }
  })
}
