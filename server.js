'use strict'

const express = require('express')
const bodyParser = require('body-parser')

const pollTravis = require('./lib/pollTravis')

const app = express()

const port = process.env.PORT || 3000

app.use(bodyParser.json())

app.all('/hooks/github', (req, res) => {
  if (wasPullRequestOpened(req)) {
    const repo = req.body.repository

    console.log(`* ${repo.owner.login}/${repo.name}/#${req.body.number} Opened, starting build checks!`)
    pollTravis.pollThenComment(repo.owner.login, repo.name, parseInt(req.body.number))
  }

  res.end()
})

// to trigger polling manually
app.get('/pr/:owner/:repo/:prId', (req, res) => {
  pollTravis.pollThenComment(req.params.owner, req.params.repo, parseInt(req.params.prId))
  res.end()
})

app.listen(process.env.PORT || 3000, () => {
  console.log('Example app listening on port', port)
})

function wasPullRequestOpened (req) {
  const githubEvent = req.headers['x-github-event'] || ''
  const githubAction = req.body.action || ''
  return githubEvent === 'pull_request' && githubAction === 'opened'
}
