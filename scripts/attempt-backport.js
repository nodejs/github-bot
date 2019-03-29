'use strict'

const { spawn } = require('child_process')
const debug = require('debug')('attempt-backport')
const request = require('request')
const { fetchExistingThenUpdatePr, removeLabelFromPR, getBotPrLabels } = require('../lib/node-repo')

const enabledRepos = ['node']
const nodeVersions = [
  { version: 7 },
  { version: 6, lts: true },
  { version: 4, lts: true }
]
const queue = []
let inProgress = false

module.exports = function (app) {
  if (!global._node_repo_dir) return

  app.on('pull_request.opened', handlePrUpdate)
  // Pull Request updates
  app.on('pull_request.synchronize', handlePrUpdate)

  // to trigger polling manually
  app.get('/attempt-backport/pr/:owner/:repo/:id', (req, res) => {
    const owner = req.params.owner
    const repo = req.params.repo
    const prId = parseInt(req.params.id, 10)
    const options = { owner, repo, prId, logger: req.log }

    if (~enabledRepos.indexOf(repo)) {
      for (const node of nodeVersions) {
        queueAttemptBackport(options, node.version, !!node.lts)
      }
    }

    if (!inProgress) processNextBackport()

    res.end()
  })
}

function handlePrUpdate (event, owner, repo) {
  if (!~enabledRepos.indexOf(repo)) return

  if (event.pull_request.base.ref !== 'master') return

  const prId = event.number
  const options = { owner, repo, prId, logger: event.logger }

  debug(`/${owner}/${repo}/pull/${prId} sync`)
  for (const node of nodeVersions) {
    queueAttemptBackport(options, node.version, !!node.lts)
  }

  if (!inProgress) processNextBackport()
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

    const cp = spawn(cmd, args, opts)
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
    // Useful when debugging.

    cp.stdout.on('data', (data) => {
      options.logger.debug(data.toString())
    })
    cp.stderr.on('data', (data) => {
      options.logger.debug(data.toString())
    })

    return cp
  }

  function onError () {
    if (!cb) return
    const _cb = cb
    setImmediate(() => {
      options.logger.debug(`backport to ${version} failed`)

      if (!isLTS) {
        options.logger.debug(`Should have added (but temporary disabled): dont-land-on-v${version}.x`)
      } else {
        getBotPrLabels(options, (err, ourLabels) => {
          if (err) {
            options.logger.error(err, 'Error fetching existing bot labels')
            return
          }

          const label = `lts-watch-v${version}.x`
          if (!ourLabels.includes(label)) return

          removeLabelFromPR(options, label)
        })
      }

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

    const cp = spawn('git', ['am', '--abort'], { cwd: global._node_repo_dir })
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
      gitRemoteUpdate()
    })
  }

  function gitRemoteUpdate () {
    options.logger.debug('updating git remotes...')
    wrapCP('git', ['remote', 'update', '-p'], gitCheckout)
  }

  function gitCheckout () {
    options.logger.debug(`checking out origin/v${version}.x-staging...`)
    wrapCP('git', ['checkout', `origin/v${version}.x-staging`], gitCleanFXD)
  }

  function gitCleanFXD () {
    wrapCP('git', ['clean', '-fdx'], fetchDiff)
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
    const cp = wrapCP('git', ['am', '-3'], { stdio: 'pipe' }, function done () {
      // Success!
      if (isLTS) {
        fetchExistingThenUpdatePr(options, [`lts-watch-v${version}.x`])
      } else {
        getBotPrLabels(options, (err, ourLabels) => {
          if (err) {
            options.logger.error(err, 'Error fetching existing bot labels')
            return
          }

          const label = `dont-land-on-v${version}.x`
          if (!ourLabels.includes(label)) return

          removeLabelFromPR(options, label)
        })
      }

      setImmediate(() => {
        options.logger.debug(`backport to v${version} successful`)
        inProgress = false
        cb()
      })
    })

    req.pipe(cp.stdin)
  }
}
