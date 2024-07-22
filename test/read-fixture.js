import fs from 'node:fs'
import path from 'node:path'

export default function readFixture (fixtureName) {
  const content = fs.readFileSync(path.join(import.meta.dirname, '_fixtures', fixtureName)).toString()
  return fixtureName.endsWith('.json') ? JSON.parse(content) : content
}
