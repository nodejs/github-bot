'use strict'

const githubClient = require('./github-client')
const GQL = require('./github-graphql-client')

const getPRComments = `query getPRComments($owner: String!, $repo: String!, $number: Int!, $cursor: String){
  repository(owner: $owner, name:  $repo) {
    pullRequest(number: $number) {
      comments(first: 20, after:$cursor) {
        nodes {
          id
          body
          viewerDidAuthor
        }
        pageInfo {
          endCursor
          hasNextPage
        }
      }
      labels(first: 15) {
        nodes {
          name
        }
      }
    }
  }
}`

function graphQlIdToRestId (nodeId) {
  const decoded = Buffer.from(nodeId, 'base64').toString()
  return decoded.match(/\d+$/)[0]
}

exports.getFirstBotComment = function getFirstBotComment ({ owner, repo, number }, cursor = null) {
  return GQL(getPRComments, { owner, repo, number, cursor }).then(data => {
    const { nodes, pageInfo } = data.repository.pullRequest.comments
    const firstBotComment = nodes.find(e => e.viewerDidAuthor)
    if (firstBotComment) {
      return firstBotComment
    }
    if (pageInfo.hasNextPage) {
      return exports.getFirstBotComment({ owner, repo, number }, pageInfo.endCursor)
    }
    return null
  })
}

exports.createPrComment = function createPrComment ({ owner, repo, number, logger }, body) {
  exports.getFirstBotComment({ owner, repo, number, logger }).then((existingComment) => {
    if (existingComment) {
      const { id: nodeId, body: oldBody } = existingComment
      const newBody = `${oldBody}\n${body}`
      const id = graphQlIdToRestId(nodeId)
      const updatedComment = { owner, repo, id, body: newBody }

      return githubClient.issues.editComment(updatedComment).catch((err) => {
        logger.error({ existingComment, updatedComment, err }, 'Error while editing existing comment on GitHub')
      })
    }

    return githubClient.issues.createComment({ owner, repo, number, body }).catch((err) => {
      logger.error(err, 'Error while creating comment on GitHub')
    })
  }, (err) => {
    logger.error(err, 'Error while trying to fetch existing bot comment on GitHub')
  })
}
