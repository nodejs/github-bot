'use strict'

const GitHubGQL = require('@octokit/graphql').defaults({
  headers: {
    'user-agent': 'Node.js GitHub Bot v1.0-beta',
    authorization: 'token ' + process.env.GITHUB_TOKEN || 'invalid-placeholder-token'
  }
})

module.exports = GitHubGQL
