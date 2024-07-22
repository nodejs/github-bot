import debugLib from 'debug'

import * as nodeRepo from '../lib/node-repo.js'

const debug = debugLib('node_ping_owners')

export default function (app, events) {
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
