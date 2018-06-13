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
      { name: 'GITHUB_ORG', value: 'nodejs' },
      { name: 'REPO_NAME', value: 'node' },
      { name: 'PR_ID', value: options.number },
      { name: 'REBASE_ONTO', value: '' }
    ]
  }
}

function triggerBuild (options, cb) {
  const { repo } = options
  const base64Credentials = new Buffer(jenkinsApiCredentials).toString('base64')
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

  request.post({
    uri: `https://ci.nodejs.org/blue/rest/organizations/jenkins/pipelines/${jobName}/runs/`,
    headers: { authorization },
    qs: { token: buildAuthToken },
    json: { parameters: buildParametersForRepo(options, repo) }
  }, (err, response) => {
    if (err) {
      return cb(err)
    } else if (response.statusCode !== 200) {
      return cb(new Error(`Expected 200 from Jenkins, got ${response.statusCode}`))
    }

    cb(null,
      `https://ci.nodejs.org/blue/organizations/jenkins/${jobName}/detail/${jobName}/${response.body.id}/pipeline`)
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

    if (repo === 'node')
      githubClient.repos.checkCollaborator({ owner, repo, username: pullRequestAuthor }, triggerBuildWhenCollaborator)
  })
}
