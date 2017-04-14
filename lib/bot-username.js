const memoize = require('async').memoize

const githubClient = require('./github-client')

function requestGitHubForUsername (cb) {
  githubClient.users.get({}, (err, currentUser) => {
    if (err) {
      return cb(err)
    }
    cb(null, currentUser.login)
  })
}

exports.resolve = memoize(requestGitHubForUsername)
