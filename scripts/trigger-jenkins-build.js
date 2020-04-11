'use strict'

const request = require('request')

const githubClient = require('../lib/github-client')
const botUsername = require('../lib/bot-username')
const { createPrComment } = require('../lib/github-comment')

const jenkinsApiCredentials = process.env.JENKINS_API_CREDENTIALS || ''

function wasBotMentionedInCiComment (commentBody) {
  const atBotName = new RegExp(`^@${botUsername} run CI`, 'mi')
  return commentBody.match(atBotName) !== null
}

// Name for the Jenkins job should be triggered for a given repository
function getJobNameForRepo (repo) {
  // e.g. JENKINS_JOB_CITGM = node-test-pull-request-lite-pipeline
  return process.env[`JENKINS_JOB_${repo.toUpperCase()}`] || ''
}

// Authentication token configured per Jenkins job needed when triggering a build,
// this is set per job in Configure -> Build Triggers -> Trigger builds remotely
function buildTokenForRepo (repo) {
  // e.g. JENKINS_BUILD_TOKEN_CITGM
  return process.env[`JENKINS_BUILD_TOKEN_${repo.toUpperCase()}`] || ''
}

function buildParametersForRepo (options, repo) {
  if (repo === 'citgm') {
    return [{
      name: 'GIT_REMOTE_REF',
      value: `refs/pull/${options.number}/head`
    }]
  } else {
    return [
      { name: 'CERTIFY_SAFE', value: 'true' },
      { name: 'PR_ID', value: options.number }
    ]
  }
}

function triggerBuild (options, cb) {
  const { repo } = options
  const base64Credentials = Buffer.from(jenkinsApiCredentials).toString('base64')
  const authorization = `Basic ${base64Credentials}`

  const jobName = getJobNameForRepo(repo)
  const buildAuthToken = buildTokenForRepo(repo)

  if (!jobName) {
    return cb(new TypeError(`Will not trigger Jenkins build because $JENKINS_JOB_${repo.toUpperCase()} is not set`))
  }

  if (!buildAuthToken) {
    return cb(new TypeError(`Will not trigger Jenkins build because $JENKINS_BUILD_TOKEN_${repo.toUpperCase()} is not set`))
  }

  options.logger.debug('Triggering Jenkins build')

  return new Promise((resolve, reject) => {
    request.post({
      uri: `https://ci.nodejs.org/blue/rest/organizations/jenkins/pipelines/${jobName}/runs/`,
      headers: { authorization },
      qs: { token: buildAuthToken },
      json: { parameters: buildParametersForRepo(options, repo) }
    }, (err, response, body) => {
      if (err) {
        return reject(err)
      } else if (response.statusCode !== 200) {
        return reject(new Error(`Expected 200 from Jenkins, got ${response.statusCode}: ${body}`))
      }

      resolve({ jobName, jobId: response.body.id })
    })
  })
}

async function triggerBuildIfValid (options) {
  const { owner, repo, author, logger } = options

  try {
    await githubClient.repos.checkCollaborator({ owner, repo, username: author })
  } catch (_err) {
    logger.debug(`Ignoring comment to me by @${options.author} because they are not a repo collaborator`)
    return
  }

  try {
    const result = await triggerBuild(options)
    const jobUrl = `https://ci.nodejs.org/job/${result.jobName}/${result.jobId}`
    logger.info({ jobUrl }, 'Jenkins build started')

    return createPrComment(options, `Lite-CI: ${jobUrl}`)
  } catch (err) {
    logger.error(err, 'Error while triggering Jenkins build')
    throw err
  }
}

module.exports = (app, events) => {
  events.on('issue_comment.created', handleCommentCreated)
  events.on('pull_request.opened', handlePullCreated)
}

function handleCommentCreated (event, owner, repo) {
  const { number, logger, comment: { body, user: { login: author } } } = event
  const options = { owner, repo, number, logger, author }

  return wasBotMentionedInCiComment(body) ? triggerBuildIfValid(options) : Promise.resolve()
}

function handlePullCreated (event, owner, repo) {
  const { number, logger, pull_request: { user: { login: author } } } = event
  const options = { owner, repo, number, logger, author }

  return repo === 'node' ? triggerBuildIfValid(options) : Promise.resolve()
}
