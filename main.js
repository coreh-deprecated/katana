var ansi = require('ansi')
var util = require('util')
var fs = require('fs')
var misc = require('./misc')
var lexer = require('./lexer')
var rewriter = require('./rewriter')
var parser = require('./parser')
var compiler = misc.pipeline(lexer, rewriter, parser)
var filename = 'test.k'
code = fs.readFileSync(filename, 'utf-8')

var cursor = ansi(process.stderr)

var tree = function(code, level) {
  if (typeof level === 'undefined') {
    level = 0
  }
  var nest = Array(level+1).join('  ')
  var cursor = ansi(process.stdout)
  process.stdout.write(nest+code.type)
  if (code.value) {
    cursor.blue()
    process.stdout.write(' ' + code.value)
    cursor.reset()
  }
  process.stdout.write('\n')
  code.children.forEach(function(child) {
    tree(child, level + 1)
  })
}

var reportError = function(err) {
  var lines = code.split('\n')
  process.stderr.write(filename + ' (')
  cursor.blue()
  process.stderr.write('line ' + err.line)
  cursor.reset()
  process.stderr.write(': ')
  cursor.blue()
  process.stderr.write('column ' + err.startColumn)
  cursor.reset()
  process.stderr.write(') ')
  cursor.red()
  process.stderr.write('syntax error: ')
  cursor.reset()
  console.error(err.message)
  cursor.grey()
  console.error(lines[err.line-1])
  cursor.green()
  var l = Math.max(1, err.endColumn - err.startColumn)
  console.error(Array(err.startColumn).join(' ') + Array(l+1).join('^'))
  cursor.reset()
  console.error() 
}

try {
  var result = compiler(code)
  result.errors.forEach(reportError)
  if (result.errors.length > 0) {
    cursor.beep()
  }
  tree(result.program)
} catch (err) {
  if (err.name !== 'ParseError') { 
    throw err
  }
}