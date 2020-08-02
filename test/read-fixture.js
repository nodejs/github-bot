'use strict'

const fs = require('fs')
const path = require('path')

module.exports = function readFixture (fixtureName) {
  const content = fs.readFileSync(path.join(__dirname, '_fixtures', fixtureName)).toString()
  return fixtureName.endsWith('.json') ? JSON.parse(content) : content
}
