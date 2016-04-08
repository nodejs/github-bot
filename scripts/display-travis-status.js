'use strict'

const debug = require('debug')('display_travis_status')
const pollTravis = require('../lib/pollTravis')
const enabledRepos = ['citgm', 'readable-stream', 'nodejs.org']

module.exports = function (app) {
  app.on('pull_request.opened', (event) => {
    const owner = event.repository.owner.login
    const repo = event.repository.name
    if (!~enabledRepos.indexOf(repo)) return

    debug(`/${owner}/${repo}/pull/${event.number} opened`)
    pollTravis.pollThenComment(owner, repo, event.number)
  })

  // to trigger polling manually
  app.get('/pr/:owner/:repo/:id', (req, res) => {
    const owner = req.params.owner
    const repo = req.params.repo
    const id = req.params.id
    if (~enabledRepos.indexOf(repo)) {
      pollTravis.pollThenComment(owner, repo, parseInt(id, 10))
    }
    res.end()
  })
}
