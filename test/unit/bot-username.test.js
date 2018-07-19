'use strict'

const proxyquire = require('proxyquire')
const sinon = require('sinon')
const tap = require('tap')

const githubClient = require('../../lib/github-client')

tap.test('botUsername.resolve(): returns username of current user', (t) => {
  sinon.stub(githubClient.users, 'get').yields(null, { login: 'nodejs-github-bot' })
  const botUsername = proxyquire('../../lib/bot-username', {
    './github-client': githubClient
  })

  t.plan(1)
  t.tearDown(() => {
    githubClient.users.get.restore()
  })

  botUsername.resolve((_, username) => {
    t.same(username, 'nodejs-github-bot')
  })
})
