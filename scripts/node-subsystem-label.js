'use strict'

const debug = require('debug')('node_subsystem_label')

const nodeRepo = require('../lib/node-repo')

const timeoutInSec = process.env.WAIT_SECONDS_BEFORE_RESOLVING_LABELS || 2

module.exports = function (app, events) {
  events.on('pull_request.opened', handlePrCreated)
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
  return nodeRepo.resolveLabelsThenUpdatePr({
    owner,
    repo,
    prId,
    logger,
    baseBranch,
    timeoutInSec
  })
}
