'use strict'

const child_process = require('child_process')
const debug = require('debug')('attempt-backport')
const request = require('request')
const node_repo = require('../lib/node-repo')
const updatePrWithLabels = node_repo.updatePrWithLabels
// const removeLabelFromPR = node_repo.removeLabelFromPR

const enabledRepos = ['node']
const queue = []
let inProgress = false

module.exports = function (app) {
  if (!global._node_repo_dir) return

  app.on('pull_request.opened', handlePrUpdate)
  // Pull Request updates
  app.on('pull_request.synchronize', handlePrUpdate)

  function handlePrUpdate (event, owner, repo) {
    if (!~enabledRepos.indexOf(repo)) return

    if (event.pull_request.base.ref !== 'master') return

    const prId = event.number
    const options = { owner, repo, prId, logger: event.logger }

    debug(`/${owner}/${repo}/pull/${prId} sync`)
    queueAttemptBackport(options, 7, false)
    queueAttemptBackport(options, 6, true)
    queueAttemptBackport(options, 4, true)

    if (!inProgress) processNextBackport()
  }

  // to trigger polling manually
  app.get('/attempt-backport/pr/:owner/:repo/:id', (req, res) => {
    const owner = req.params.owner
    const repo = req.params.repo
    const prId = parseInt(req.params.id, 10)
    const options = { owner, repo, prId, logger: req.log }

    if (~enabledRepos.indexOf(repo)) {
      queueAttemptBackport(options, 7, false)
      queueAttemptBackport(options, 6, true)
      queueAttemptBackport(options, 4, true)
    }

    if (!inProgress) processNextBackport()

    res.end()
  })
}

function processNextBackport () {
  const item = queue.shift()
  if (!item) return

  if (typeof item !== 'function') {
    debug(`item was not a function! - queue size: ${queue.length}`)
    return
  } else if (inProgress) {
    debug(`was still in progress! - queue size: ${queue.length}`)
    return
  }
  item()
}

function queueAttemptBackport (options, version, isLTS) {
  queue.push(function () {
    options.logger.debug(`processing a new backport to v${version}`)
    attemptBackport(options, version, isLTS, processNextBackport)
  })
}

function attemptBackport (options, version, isLTS, cb) {
  // Start
  gitAmAbort()

  function wrapCP (cmd, args, opts, callback) {
    let exited = false

    if (arguments.length === 3) {
      callback = opts
      opts = {}
    }

    opts.cwd = global._node_repo_dir

    const cp = child_process.spawn(cmd, args, opts)
    const argsString = [cmd, ...args].join(' ')

    cp.on('error', function (err) {
      debug(`child_process err: ${err}`)
      if (!exited) onError()
    })
    cp.on('exit', function (code) {
      exited = true
      if (!cb) {
        debug(`error before exit, code: ${code}, on '${argsString}'`)
        return
      } else if (code > 0) {
        debug(`exit code > 0: ${code}, on '${argsString}'`)
        onError()
        return
      }
      callback()
    })
    // // Useful when debugging.
    //
    // cp.stdout.on('data', (data) => {
    //   options.logger.debug(data.toString())
    // })
    // cp.stderr.on('data', (data) => {
    //   options.logger.debug(data.toString())
    // })

    return cp
  }

  function onError () {
    if (!cb) return
    const _cb = cb
    setImmediate(() => {
      options.logger.debug(`backport to ${version} failed`)
      if (!isLTS) updatePrWithLabels(options, [`dont-land-on-v${version}.x`])
      setImmediate(() => {
        inProgress = false
        _cb()
      })
    })
    cb = null
  }

  function gitAmAbort () {
    // TODO(Fishrock123): this should probably just merge into wrapCP
    let exited = false
    options.logger.debug('aborting any previous backport attempt...')

    const cp = child_process.spawn('git', ['am', '--abort'], { cwd: global._node_repo_dir })
    const argsString = 'git am --abort'

    cp.on('error', function (err) {
      debug(`child_process err: ${err}`)
      if (!exited) onError()
    })
    cp.on('exit', function (code) {
      exited = true
      if (!cb) {
        debug(`error before exit, code: ${code}, on '${argsString}'`)
        return
      }
      gitResetBefore()
    })
  }

  function gitResetBefore () {
    options.logger.debug(`resetting origin/v${version}.x-staging...`)
    wrapCP('git', ['reset', `origin/v${version}.x-staging`, '--hard'], gitRemoteUpdate)
  }

  function gitRemoteUpdate () {
    options.logger.debug('updating git remotes...')
    wrapCP('git', ['remote', 'update', '-p'], gitCheckout)
  }

  function gitCheckout () {
    options.logger.debug(`checking out origin/v${version}.x-staging...`)
    wrapCP('git', ['checkout', `origin/v${version}.x-staging`], gitReset)
  }

  function gitReset () {
    options.logger.debug(`resetting origin/v${version}.x-staging...`)
    wrapCP('git', ['reset', `origin/v${version}.x-staging`, '--hard'], fetchDiff)
  }

  function fetchDiff () {
    options.logger.debug(`fetching diff from pr ${options.prId}...`)

    const url = `https://patch-diff.githubusercontent.com/raw/${options.owner}/${options.repo}/pull/${options.prId}.patch`

    const req = request(url)

    req.on('error', function (err) {
      debug(`request err: ${err}`)
      return onError()
    })
    req.on('response', function (response) {
      if (response.statusCode !== 200) {
        debug(`request non-200 status: ${response.statusCode}`)
        return onError()
      }
    })

    gitAttemptBackport(req)
  }

  function gitAttemptBackport (req) {
    options.logger.debug(`attempting a backport to v${version}...`)
    const cp = wrapCP('git', ['am'], { stdio: 'pipe' }, function done () {
      // Success!
      if (isLTS) {
        updatePrWithLabels(options, [`lts-watch-v${version}.x`])
      }// else {
        // TODO(Fishrock123): Re-enable this, but do a check first
        // to make sure the label was set by the bot only.
        // removeLabelFromPR(options, `dont-land-on-v${version}.x`)
      // }

      setImmediate(() => {
        options.logger.debug(`backport to v${version} successful`)
        inProgress = false
        cb()
      })
    })

    req.pipe(cp.stdin)
  }
}
