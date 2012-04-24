var ansi = require('ansi')
var fs = require('fs')
var misc = require('./misc')

var lexer = require('./lexer')
var rewriter = require('./rewriter')
var parser = require('./parser')

var compiler = misc.pipeline(lexer, rewriter, parser)

var filename = 'test.k'

var code = fs.readFileSync(filename, 'utf-8')

var cursor = ansi(process.stderr)

try {
  var result = compiler(code)
  if (result.errors.length > 0) {
    cursor.beep()
    misc.writeErrors(process.stderr, filename, code, result.errors)
  } else {
    misc.writeTree(process.stdout, result.program)
  }
} catch (err) {
  cursor.beep()
  cursor.red()
  process.stderr.write('INTERNAL ERROR.')
  cursor.reset()
  process.stderr.write('\n\nThe compiler encountered an internal logic error.\nThis is not a problem with your code, but within the compiler itself.\n\nPlease report this entire error log at ')
  cursor.blue()
  cursor.underline()
  process.stderr.write('https://github.com/coreh/katana')
  cursor.reset()
  process.stderr.write(',\nif possible along with the input that uncovered the error.\n\nSorry for the inconvenience.\n\n')
  console.error(err.stack)
}