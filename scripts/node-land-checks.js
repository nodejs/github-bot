const { createStatus } = require('../lib/node-land-checks')

module.exports = (app) => {
  app.on('pull_request.opened', (event, owner, repo) => {
    createStatus({
      sha: event.pull_request.head.sha,
      state: 'pending'
    })
  })
}
