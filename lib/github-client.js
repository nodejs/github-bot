'use strict'

const GitHub = require('github')

const githubClient = new GitHub({
  debug: require('debug')('github').enabled,
  version: '3.0.0',
  protocol: 'https',
  host: 'api.github.com',
  timeout: 5 * 1000,
  headers: {
    'user-agent': 'Node.js GitHub Bot v1.0-beta'
  }
})

githubClient.authenticate({
  type: 'oauth',
  token: process.env.GITHUB_TOKEN
})

// store/cache info about the authenticated user
githubClient.user.get({}, (error, user) => {
  if (error) return console.error(error)
  console.log('authenticated as:', user.login)
  githubClient.user = user
})

module.exports = githubClient
