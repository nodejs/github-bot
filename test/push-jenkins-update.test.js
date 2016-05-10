'use strict'

const tap = require('tap')
const fs = require('fs')
const path = require('path')
const url = require('url')
const nock = require('nock')
const supertest = require('supertest')

const app = require('../app')

tap.test('Sends POST requests to https://api.github.com/repos/nodejs/node/statuses/<SHA>', (t) => {
  const fixture = readFixture('success-payload.json')
  const scope = nock('https://api.github.com')
                  .filteringPath(ignoreQueryParams)
                  .post('/repos/nodejs/node/statuses/8a5fec2a6bade91e544a30314d7cf21f8a200de1')
                  .reply(201)

  t.plan(1)
  t.tearDown(() => scope.done())

  supertest(app)
    .post('/node/jenkins')
    .send(fixture)
    .expect(201)
    .end((err, res) => {
      t.equal(err, null)
    })
})

tap.test('Forwards payload provided in incoming POST to GitHub status API', (t) => {
  const fixture = readFixture('success-payload.json')
  const scope = nock('https://api.github.com')
                  .filteringPath(ignoreQueryParams)
                  .post('/repos/nodejs/node/statuses/8a5fec2a6bade91e544a30314d7cf21f8a200de1', {
                    state: 'success',
                    context: 'test/osx',
                    description: 'tests passed',
                    target_url: 'https://ci.nodejs.org/job/node-test-commit-osx/3157/'
                  })
                  .reply(201)

  t.plan(1)
  t.tearDown(() => scope.done())

  supertest(app)
    .post('/node/jenkins')
    .send(fixture)
    .expect(201)
    .end((err, res) => {
      t.equal(err, null)
    })
})

function ignoreQueryParams (pathAndQuery) {
  return url.parse(pathAndQuery, true).pathname
}

function readFixture (fixtureName) {
  const content = fs.readFileSync(path.join(__dirname, '_fixtures', fixtureName)).toString()
  return JSON.parse(content)
}
