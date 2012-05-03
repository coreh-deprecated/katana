var katana = require('../lib')
var fs = require('fs')
var ansi = require('ansi')
var cursor = ansi(process.stdout)

var compile = function(path) {
  var compiler = new katana.Compiler()
  compiler.compile(path)
  return compiler
}

var test = function(program) {
  try {
    cursor.write(program + ': ')
    if (compile(__dirname + '/' + program + '.k').failed) {
      cursor.red().write('reject\n').reset()
    } else {
      cursor.green().write('accept\n').reset()
    }
  } catch (e) {
    cursor.red().write('internal error\n').reset()    
  }
}

var tests =
[ 'acceptance/001.empty'
, 'acceptance/002.comments'
, 'acceptance/003.literals'
, 'acceptance/004.constants'
, 'acceptance/005.statements'
, 'acceptance/006.asi'
, 'acceptance/007.aci'
, 'acceptance/008.expressions'
, 'acceptance/009.variables'
, 'acceptance/010.offside'
, 'acceptance/011.scope'
, 'acceptance/012.exports'
, 'acceptance/013.imports'
, 'acceptance/014.prototypes'
]

tests.forEach(test)