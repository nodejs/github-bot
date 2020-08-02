'use static'

const { parse } = require('codeowners-utils')
// NOTE(mmarchini): `codeowners-utils` doesn't respect ./ prefix,
// so we use micromatch
const micromatch = require('micromatch')

class Owners {
  constructor (ownersDefinitions) {
    this._ownersDefinitions = ownersDefinitions
  }

  static fromFile (content) {
    return new Owners(parse(content))
  }

  getOwnersForPaths (paths) {
    let ownersForPath = []
    for (const { pattern, owners } of this._ownersDefinitions) {
      if (micromatch(paths, pattern).length > 0) {
        ownersForPath = ownersForPath.concat(owners)
      }
    }
    // Remove duplicates before returning
    return ownersForPath.filter((v, i) => ownersForPath.indexOf(v) === i).sort()
  }
}

module.exports = {
  Owners
}
