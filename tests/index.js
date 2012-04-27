var compiler = require('../lib')
var fs = require('fs')
var ansi = require('ansi')
var cursor = ansi(process.stdout)

var compile = function(path) {
  var code = fs.readFileSync(path, 'utf-8')
  return compiler(code)
}

var test = function(program) {
  try {
    cursor.write(program + ': ')
    var errors = compile(__dirname + '/' + program + '.k').errors
    if (errors.length == 0) {
      cursor.green().write('accept\n').reset()
    } else {
      cursor.red().write('reject\n').reset()
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
]

tests.forEach(test)