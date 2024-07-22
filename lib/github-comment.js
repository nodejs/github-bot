/* eslint-disable camelcase */

import githubClient from './github-client.js'

export async function createPrComment ({ owner, repo, issue_number, logger }, body) {
  try {
    await githubClient.issues.createComment({
      owner,
      repo,
      issue_number,
      body
    })
  } catch (err) {
    logger.error(err, 'Error while creating comment on GitHub')
    throw err
  }
}
