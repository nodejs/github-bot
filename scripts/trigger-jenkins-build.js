'use strict'

const request = require('request')

const githubClient = require('../lib/github-client')
const botUsername = require('../lib/bot-username')

const jenkinsApiCredentials = process.env.JENKINS_API_CREDENTIALS || ''

function ifBotWasMentionedInCiComment (commentBody, cb) {
  botUsername.resolve((err, username) => {
    if (err) {
      return cb(err)
    }

    const atBotName = new RegExp(`^@${username} run CI`, 'mi')
    const wasMentioned = commentBody.match(atBotName) !== null

    cb(null, wasMentioned)
  })
}

// URL to the Jenkins job should be triggered for a given repository
function buildUrlForRepo (repo) {
  // e.g. JENKINS_JOB_URL_CITGM = https://ci.nodejs.org/job/citgm-continuous-integration-pipeline
  const jobUrl = process.env[`JENKINS_JOB_URL_${repo.toUpperCase()}`] || ''
  return jobUrl ? `${jobUrl}/build` : ''
}

// Authentication token configured per Jenkins job needed when triggering a build,
// this is set per job in Configure -> Build Triggers -> Trigger builds remotely
function buildTokenForRepo (repo) {
  // e.g. JENKINS_BUILD_TOKEN_CITGM
  return process.env[`JENKINS_BUILD_TOKEN_${repo.toUpperCase()}`] || ''
}

function triggerBuild (options, cb) {
  const { repo } = options
  const base64Credentials = new Buffer(jenkinsApiCredentials).toString('base64')
  const authorization = `Basic ${base64Credentials}`
  const buildParameters = [{
    name: 'GIT_REMOTE_REF',
    value: `refs/pull/${options.number}/head`
  }]
  const payload = JSON.stringify({ parameter: buildParameters })
  const uri = buildUrlForRepo(repo)
  const buildAuthToken = buildTokenForRepo(repo)

  if (!uri) {
    return cb(new TypeError(`Will not trigger Jenkins build because $JENKINS_JOB_URL_${repo.toUpperCase()} is not set`))
  }

  if (!buildAuthToken) {
    return cb(new TypeError(`Will not trigger Jenkins build because $JENKINS_BUILD_TOKEN_${repo.toUpperCase()} is not set`))
  }

  options.logger.debug('Triggering Jenkins build')

  request.post({
    uri,
    headers: { authorization },
    qs: { token: buildAuthToken },
    form: { json: payload }
  }, (err, response) => {
    if (err) {
      return cb(err)
    } else if (response.statusCode !== 201) {
      return cb(new Error(`Expected 201 from Jenkins, got ${response.statusCode}`))
    }

    cb(null, response.headers.location)
  })
}

function createPrComment ({ owner, repo, number, logger }, body) {
  githubClient.issues.createComment({
    owner,
    repo,
    number,
    body
  }, (err) => {
    if (err) {
      logger.error(err, 'Error while creating comment to reply on CI run comment')
    }
  })
}

module.exports = (app) => {
  app.on('issue_comment.created', function handleCommentCreated (event, owner, repo) {
    const { number, logger, comment } = event
    const commentAuthor = comment.user.login
    const options = {
      owner,
      repo,
      number,
      logger
    }

    function replyToCollabWithBuildStarted (err, buildUrl) {
      if (err) {
        logger.error(err, 'Error while triggering Jenkins build')
        return createPrComment(options, `@${commentAuthor} sadly an error occured when I tried to trigger a build :(`)
      }

      createPrComment(options, `@${commentAuthor} build started: ${buildUrl}`)
      logger.info({ buildUrl }, 'Jenkins build started')
    }

    function triggerBuildWhenCollaborator (err) {
      if (err) {
        return logger.debug(`Ignoring comment to me by @${commentAuthor} because they are not a repo collaborator`)
      }

      triggerBuild(options, replyToCollabWithBuildStarted)
    }

    ifBotWasMentionedInCiComment(comment.body, (err, wasMentioned) => {
      if (err) {
        return logger.error(err, 'Error while checking if the bot username was mentioned in a comment')
      }

      if (!wasMentioned) return

      githubClient.repos.checkCollaborator({ owner, repo, username: commentAuthor }, triggerBuildWhenCollaborator)
    })
  })

  app.on('pull_request.opened', function handlePullCreated (event, owner, repo) {
    const { number, logger, pull_request } = event
    const pullRequestAuthor = pull_request.user.login
    const options = {
      owner,
      repo,
      number,
      logger
    }

    function replyToCollabWithBuildStarted (err, buildUrl) {
      if (err) {
        logger.error(err, 'Error while triggering Jenkins build')
        return createPrComment(options, `@${pullRequestAuthor} sadly an error occured when I tried to trigger a build :(`)
      }

      createPrComment(options, `@${pullRequestAuthor} build started: ${buildUrl}`)
      logger.info({ buildUrl }, 'Jenkins build started')
    }

    function triggerBuildWhenCollaborator (err) {
      if (err) {
        return logger.debug(`Ignoring comment to me by @${pullRequestAuthor} because they are not a repo collaborator`)
      }

      triggerBuild(options, replyToCollabWithBuildStarted)
    }

    githubClient.repos.checkCollaborator({ owner, repo, username: pullRequestAuthor }, triggerBuildWhenCollaborator)
  })
}
