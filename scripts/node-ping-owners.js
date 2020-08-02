'use strict'

const debug = require('debug')('node_ping_owners')

const nodeRepo = require('../lib/node-repo')

module.exports = function (app, events) {
  events.on('pull_request.opened', handlePrCreated)
}

function handlePrCreated (event, owner, repo) {
  const prId = event.number
  const logger = event.logger
  const baseBranch = event.pull_request.base.ref

  debug(`/${owner}/${repo}/pull/${prId} opened`)
  nodeRepo.resolveOwnersThenPingPr({
    owner,
    repo,
    prId,
    logger,
    baseBranch,
    timeoutInSec: 2
  }).catch(err => {
    event.logger.error(err, 'owners ping failed')
  })
}
