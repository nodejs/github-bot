'use static'

const { parse, matchPattern } = require('codeowners-utils')

class Owners {
  constructor (ownersDefinitions) {
    this._ownersDefinitions = ownersDefinitions
  }

  static fromFile (content) {
    return new Owners(parse(content))
  }

  getOwnersForPaths (paths) {
    let ownersForPaths = []
    for (const { pattern, owners } of this._ownersDefinitions) {
      for (const path of paths) {
        if (matchPattern(path, pattern)) {
          ownersForPaths = ownersForPaths.concat(owners)
        }
      }
    }
    // Remove duplicates before returning
    return ownersForPaths.filter((v, i) => ownersForPaths.indexOf(v) === i).sort()
  }
}

module.exports = {
  Owners
}
