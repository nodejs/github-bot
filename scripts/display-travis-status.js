'use strict'

const debug = require('debug')('display_travis_status')
const pollTravis = require('../lib/pollTravis')

// Default is 20 retries, 30 seconds per retry, which is reasonable for
// smaller projects that finish testing within 10 minutes.
const DEFAULT_POLL_RETRY = process.env.TRAVIS_POLL_RETRY || 20
const DEFAULT_POLL_INTERVAL = process.env.TRAVIS_POLL_INTERVAL || 30

// For projects that take longer to build e.g. projects that actually use
// Travis to build, increase the interval so there will be fewer useless
// polls
const enabledRepos = {
  'citgm': { retry: 40 },
  'readable-stream': { retry: 60, interval: 60 },
  'string_decoder': { retry: 60, interval: 60 },
  'nodejs.org': { },
  'docker-node': { retry: 70, interval: 120 },
  'llnode': { retry: 60, interval: 60 },
  'nan': { retry: 60, interval: 60 },
  'node-core-utils': { },
  'core-validate-commit': { }
}

module.exports = function (app) {
  app.on('pull_request.opened', handlePrUpdate)
  // Pull Request updates
  app.on('pull_request.synchronize', handlePrUpdate)

  function handlePrUpdate (event, owner, repo) {
    const config = enabledRepos[repo]
    if (!config) return

    const pr = event.number
    const retry = config.retry || DEFAULT_POLL_RETRY
    const interval = config.interval || DEFAULT_POLL_INTERVAL
    const options = { owner, repo, pr, retry, interval, logger: event.logger }

    debug(`/${owner}/${repo}/pull/${pr} opened`)
    pollTravis.pollThenStatus(options)
  }

  // to trigger polling manually
  app.get('/pr/:owner/:repo/:id', (req, res) => {
    const owner = req.params.owner
    const repo = req.params.repo
    const pr = parseInt(req.params.id, 10)
    const config = enabledRepos[repo]
    if (config) {
      const retry = config.retry || DEFAULT_POLL_RETRY
      const interval = config.interval || DEFAULT_POLL_INTERVAL
      const options = { owner, repo, pr, retry, interval, logger: req.log }
      res.writeHead(201)
      pollTravis.pollThenStatus(options)
    } else {
      res.writeHead(404, 'Repo not enabled')
    }
    res.end()
  })
}
