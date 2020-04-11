'use strict'

const githubClient = require('./github-client')

exports.createPrComment = async function createPrComment ({ owner, repo, number, logger }, body) {
  try {
    await githubClient.issues.createComment({
      owner,
      repo,
      number,
      body
    })
  } catch (err) {
    logger.error(err, 'Error while creating comment on GitHub')
    throw err
  }
}
