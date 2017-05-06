'use strict'

const fs = require('fs')
const path = require('path')
const raw = (filename) => fs.readFileSync(path.join(__dirname, '_fixtures', filename)).toString()

module.exports = function readFixture (fixtureName) {
  const content = raw(fixtureName)
  return JSON.parse(content)
}

module.exports.raw = raw
