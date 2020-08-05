'use strict'

const GitHub = require('@octokit/rest')

const githubClient = new GitHub({
  version: '3.0.0',
  timeout: 5 * 1000,
  headers: {
    'user-agent': 'Node.js GitHub Bot v1.0-beta'
  }
})

githubClient.authenticate({
  type: 'oauth',
  token: process.env.GITHUB_TOKEN || 'invalid-placeholder-token'
})

module.exports = githubClient
