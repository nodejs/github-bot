'use strict'

const proxyquire = require('proxyquire')
const sinon = require('sinon')
const tap = require('tap')

const githubComment = require('../../lib/github-comment.js')

tap.test('githubComment.getLastBotComment(): returns the last comment made by the bot', (t) => {
  t.plan(1)
  return githubComment.getFirstBotComment({ owner: 'nodejs', repo: 'node', number: 26322 }).then((res) => {
    t.same(res.user.id, 18269663)
  })
})
