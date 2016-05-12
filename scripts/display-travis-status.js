'use strict'

const debug = require('debug')('display_travis_status')
const pollTravis = require('../lib/pollTravis')
const enabledRepos = ['citgm', 'readable-stream', 'nodejs.org', 'test-github-bot', 'docker-node']

module.exports = function (app) {
  app.on('pull_request.opened', handlePrUpdate)
  // Pull Request updates
  app.on('pull_request.synchronize', handlePrUpdate)

  function handlePrUpdate (event, owner, repo, pr) {
    if (!~enabledRepos.indexOf(repo)) return

    const options = { owner, repo, pr, logger: event.logger }

    debug(`/${owner}/${repo}/pull/${pr} opened`)
    pollTravis.pollThenStatus(options)
  }

  // to trigger polling manually
  app.get('/pr/:owner/:repo/:id', (req, res) => {
    const owner = req.params.owner
    const repo = req.params.repo
    const pr = parseInt(req.params.id, 10)
    const options = { owner, repo, pr, logger: req.log }

    if (~enabledRepos.indexOf(repo)) {
      pollTravis.pollThenStatus(options)
    }
    res.end()
  })
}
