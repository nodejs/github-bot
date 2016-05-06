'use strict'

const githubClient = require('./github-client')

const jenkinsToGhStatusMap = {
  'SUCCESS': {
    state: 'success',
    message: 'all tests passed'
  },
  'FAILURE': {
    state: 'failure',
    message: 'build failure'
  },
  'ABORTED': {
    state: 'error',
    message: 'build aborted'
  },
  'UNSTABLE': {
    state: 'error',
    message: 'build unstable'
  }
}

const rxDisplayName = /node\-test\-commit\-(\w+)/

function pushJenkinsUpdate (options, build) {
  const statusOpts = extendWithBuildData(options, build)
  const createGhStatus = createGhStatusFn(statusOpts)
  const isPending = build.result === null
  const matchedGhStatus = jenkinsToGhStatusMap[build.result]

  if (isPending) {
    createGhStatus('pending', 'build in progress')
  } else if (matchedGhStatus) {
    createGhStatus(matchedGhStatus.state, matchedGhStatus.message)
  } else {
    console.error(`! ${prInfoStr(options)} Unknown Jenkins build result '${build.result}'`)
  }
}

function createGhStatusFn (options) {
  const prInfo = prInfoStr(options)

  return (state, message) => {
    githubClient.statuses.create({
      user: options.owner,
      repo: options.repoName,
      sha: options.sha,
      target_url: options.url,
      context: options.context,
      state: state,
      description: message
    }, (err, res) => {
      if (err) {
        return console.error(`! ${prInfo} Error while updating Jenkins / GitHub PR status`, err)
      }
      console.log(`* ${prInfo} Jenkins / Github PR status updated to '${state}'`)
    })
  }
}

function extendWithBuildData (options, build) {
  const lastChangeSet = build.changeSet.items[0]

  return Object.assign({
    sha: lastChangeSet.commitId,
    url: build.url,
    context: jobNameToStatusCtx(build.fullDisplayName)
  }, options)
}

function jobNameToStatusCtx (displayName) {
  return rxDisplayName.exec(displayName)[1]
}

function prInfoStr (options) {
  return `${options.owner}/${options.repoName}`
}

module.exports = pushJenkinsUpdate
