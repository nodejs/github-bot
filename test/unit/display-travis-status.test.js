'use strict'

const tap = require('tap')
const supertest = require('supertest')
const proxyquire = require('proxyquire')
const readFixture = require('../read-fixture')

tap.test('Poll for Travis builds when PR is updated', (t) => {
  t.plan(6)

  const pollStub = (options) => {
    t.equal(options.owner, 'nodejs')
    t.equal(options.repo, 'node-core-utils')
    t.equal(options.pr, 100)
    t.equal(options.retry, 20)
    t.equal(options.interval, 30)
  }

  const testStubs = {
    './github-secret': {
      isValid: () => true,
      '@global': true
    },
    '../lib/pollTravis': {
      pollThenStatus: pollStub,
      '@global': true
    }
  }

  const app = proxyquire('../../app', testStubs)

  const githubPayload = readFixture('github-pr-payload.json')
  supertest(app)
    .post('/hooks/github')
    .set('x-github-event', 'pull_request')
    .send(githubPayload)
    .expect(200)
    .end((err, res) => {
      t.equal(err, null)
    })
})

tap.test('Poll for Travis builds when manually triggered', (t) => {
  t.plan(6)

  const pollStub = (options) => {
    t.equal(options.owner, 'nodejs')
    t.equal(options.repo, 'node-core-utils')
    t.equal(options.pr, 100)
    t.equal(options.retry, 20)
    t.equal(options.interval, 30)
  }

  const testStubs = {
    './github-secret': {
      isValid: () => true,
      '@global': true
    },
    '../lib/pollTravis': {
      pollThenStatus: pollStub,
      '@global': true
    }
  }

  const app = proxyquire('../../app', testStubs)

  supertest(app)
    .get('/pr/nodejs/node-core-utils/100')
    .expect(201)
    .end((err, res) => {
      t.equal(err, null)
    })
})

tap.test('Return 404 when repo has not been enabled', (t) => {
  t.plan(1)

  const pollStub = (options) => {
    t.fail('should not be called')
  }

  const testStubs = {
    './github-secret': {
      isValid: () => true,
      '@global': true
    },
    '../lib/pollTravis': {
      pollThenStatus: pollStub,
      '@global': true
    }
  }

  const app = proxyquire('../../app', testStubs)

  supertest(app)
    .get('/pr/nodejs/not-valid-repo/100')
    .expect(404)
    .end((err, res) => {
      t.equal(err, null)
    })
})
