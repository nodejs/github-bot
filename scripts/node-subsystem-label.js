'use strict'

const debug = require('debug')('node_subsystem_label')

const nodeRepo = require('../lib/node-repo')

module.exports = function (app) {
  app.on('pull_request.opened', handlePrCreated)
}

function handlePrCreated (event, owner, repo) {
  const prId = event.number
  const logger = event.logger
  const baseBranch = event.pull_request.base.ref

  // subsystem labelling is for node core only
  if (repo !== 'node') return

  debug(`/${owner}/${repo}/pull/${prId} opened`)
  // by not hard coding the owner repo to nodejs/node here,
  // we can test these this script in a different repo than
  // *actual* node core as long as the repo is named "node"
  nodeRepo.resolveLabelsThenUpdatePr({
    owner,
    repo,
    prId,
    logger,
    baseBranch,
    timeoutInSec: 2
  })
}
