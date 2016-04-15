'use strict'

require('dotenv').load({ silent: true })

const ƒ = require('effd')
const request = require('request')
const debug = require('debug')('manage-members')
const githubClient = require('../lib/github-client.js')
const github = {
  issues: ƒ.promisify(githubClient.issues),
  pullRequests: ƒ.promisify(githubClient.pullRequests),
  orgs: ƒ.promisify(githubClient.orgs)
}

// we need this RegExp to have the global flag
const mentionsRegex = new RegExp(require('mentions-regex')().source, 'g')
const exclude = (a, b) => a.filter((x) => !b.find((y) => y === x))
const error = (e) => typeof e === 'string' ? debug(e) : console.error(e)
const findREADME = (array) => array.find((name) => /readme.md/i.test(name))

module.exports = function (app) {
  app.on('push', (event, org, repo) => {
    const head = event.head_commit
    const readme = findREADME(head.modified) || findREADME(head.added)
    if (!readme) return

    download(`https://github.com/${org}/${repo}/raw/${head.id}/${readme}`)
    .then((content) =>
      findChangedMembers(org, repo, content)
    )
    .then((changes) =>
      updateMembers(org, changes) || ƒ.reject('No members changed')
    )
    .catch(error)
  })

  app.on('pull_request.opened', comment)
  app.on('pull_request.synchronize', comment)

  app.on('pull_request.assigned', (event, user, repo) => {
    if (event.assignee.login !== githubClient.user.login) return

    const number = event.number
    github.issues.edit({ user, repo, number, assignee: '' })
    .catch(console.error)

    comment(event, user, repo)
  })
}

function updateMembers (org, changes) {
  debug('updateMembers %s %j', org, changes)
  if (!changes.added.length && !changes.removed.length) return

  return ƒ.all([].concat(
    changes.added.map((user) =>
      github.orgs.addTeamMembership({ id: changes.id, user }).catch(error)
    ),
    changes.removed.map((user) =>
      github.orgs.deleteTeamMember({ id: changes.id, user }).catch(error)
  )))
}

function comment (event, user, repo) {
  var number = event.number
  debug('comment %s %s %s', user, repo, number)
  return (
    getREADME(user, repo, number)
    .then((readme) =>
      findChangedMembers(user, repo, readme)
    )
    .then((changes) =>
      createMessage(user, changes) || ƒ.reject('No members changed')
    )
    .then((message) =>
      findExistingComment(user, repo, number)
      .then((comment) =>
        comment
          ? github.issues.editComment({ user, repo, id: comment.id, body: message + updated() })
          : github.issues.createComment({ user, repo, number, body: message }) // TODO: test this path
      )
    )
    .then((comment) => { debug('comment posted') })
    .catch(error)
  )
}

function updated () {
  return `\n<sub>updated on ${new Date().toISOString()}</sub>`
}

function getREADME (org, repo, number) {
  debug('getREADME %s %s %d', org, repo, number)

  return github.pullRequests.getFiles({ user: org, repo, number, per_page: 100 })
  .then((files) =>
    files.find((file) => /^README.md$/i.test(file.filename)) || ƒ.reject('Not Applicable')
  )
  .then((readme) =>
    download(readme.raw_url)
  )
}

function findChangedMembers (org, repo, content) {
  debug('findChangedMembers %s %s', org, repo)

  const match = content.match(/<!-- team:([^ ]+).+([^<]+)<!-- team/)
  if (!match) return ƒ.reject('Members section not found')

  const name = match[1]
  const mentions = match[2].match(mentionsRegex).map((mention) => mention.substr(2).toLocaleLowerCase())

  return (
    github.orgs.getTeams({ org, per_page: 100 })
    .then((teams) =>
      teams.find((t) => t.name === name) || ƒ.error('Team Not Found: ' + name)
    )
    .then((team) =>
      github.orgs.getTeamMembers({ id: team.id, per_page: 100 })
      .then((members) =>
        members.map((member) => member.login.toLocaleLowerCase())
      )
      .then((members) => ({
        id: team.id,
        team: name,
        added: exclude(mentions, members),
        removed: exclude(members, mentions)
      }))
    )
  )
}

function download (url) {
  debug('downloading %s', url)
  return ƒ((Ø) => {
    request(url, (error, response, body) => {
      if (error) return Ø.error(error)
      if (response.statusCode !== 200) return Ø.error(`Download Failed: ${response.statusCode} ${response.statusMessage}`)
      Ø.done(body)
    })
  })
}

function createMessage (org, changes) {
  debug('createMessage %s %j', org, changes)
  if (!changes.added.length && !changes.removed.length) return

  var message = `This merge, if accepted, will cause changes to the @${org}/${changes.team} team.\n`
  if (changes.added.length) {
    message += `- Add: @${changes.added.join(', @')}\n`
  }
  if (changes.removed.length) {
    message += `- Remove: @${changes.removed.join(', @')}\n`
  }

  return message
}

function findExistingComment (user, repo, number) {
  debug('findExistingComment %s %s %d', user, repo, number)

  return github.issues.getComments({ user, repo, number })
  .then((comments) =>
    comments.find((comment) => {
      return comment.user.login === githubClient.user.login
    })
  )
}
