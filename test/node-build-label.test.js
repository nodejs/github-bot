'use strict'

const tap = require('tap')

const nodeLabels = require('../lib/node-labels')

tap.test('label: "build" when build related files has been changed', (t) => {
  const buildRelatedFiles = [
    'configure',
    'node.gyp',
    'common.gypi',
    'BSDmakefile',
    'Makefile',
    'tools/Makefile'
  ]

  buildRelatedFiles.forEach((filepath) => {
    const labels = nodeLabels.resolveLabels([ filepath ])

    t.same(labels, ['build'], filepath + ' got "build" label')
  })

  t.end()
})

tap.test('labels: not "build" when Makefile in ./deps has been changed', (t) => {
  const labels = nodeLabels.resolveLabels([
    'deps/v8/Makefile'
  ])

  t.notOk(labels.includes('build'))

  t.end()
})
