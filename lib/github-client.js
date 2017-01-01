'use strict'

require('dotenv').load({ silent: true })
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
  token: process.env.GITHUB_TOKEN || 'invalid-placeholder-token'
})

// Gets all pages of a paged response
// example:
//   github.orgs.getTeams({ org:'nodejs' })
//   .then(github.allPages)
//   .then(console.log)
githubClient.allPages = (res1, out = []) =>
  githubClient.hasNextPage(res1)
    ? githubClient.getNextPage(res1)
  .then((res2) => githubClient.allPages(res2, out.concat(res1)))
    : out.concat(res1)

// Pages through responses until the predicate matches. Returns matched item.
// example:
//   github.orgs.getTeams({ org:'nodejs' })
//   .then(github.find(t => t.name === 'addon-api'))
//   .then(console.log)
githubClient.find = (predicate) => {
  const finder = (res) => {
    var found = res.find(predicate)
    if (typeof found !== 'undefined') return found

    return githubClient.hasNextPage(res) && githubClient.getNextPage(res).then(finder)
  }
  return finder
}

module.exports = githubClient
