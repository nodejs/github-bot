'use strict'

const githubClient = require('./github-client')

function pushJenkinsUpdate (options, build) {
  const statusOpts = extendWithBuildData(options, build)
  const createGhStatus = createGhStatusFn(statusOpts)

  createGhStatus(build.status, build.message)
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
        return console.error(`! ${prInfo} Error while updating Jenkins / GitHub PR status to '${state}' for ${options.context}`, err)
      }
      console.log(`* ${prInfo} Jenkins / Github PR status updated to '${state}' for ${options.context}`)
    })
  }
}

function extendWithBuildData (options, build) {
  return Object.assign({
    sha: build.commit,
    url: build.url,
    context: build.identifier
  }, options)
}

function prInfoStr (options) {
  const shortSha = options.sha.substr(0, 7)
  return `${options.owner}/${options.repoName}/${shortSha}`
}

module.exports = pushJenkinsUpdate
