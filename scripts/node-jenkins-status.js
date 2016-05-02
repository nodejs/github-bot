'use strict'

const pollJenkins = require('../lib/poll-jenkins')

module.exports = function (app) {
  // to trigger polling manually
  app.get('/jenkins/:prId', (req, res) => {
    const prId = req.params.prId

    pollJenkins({
      owner: 'nodejs',
      repoName: 'node',
      prId: parseInt(prId, 10)
    })

    res.end()
  })
}
