var util = require('util')

var misc = require('./misc')
var lexer = require('./lexer')
var rewriter = require('./rewriter')
var parser = require('./parser')

var input = 
'1 2 3 4\n' +
'1 2 3 4\n' +
'1 2 3 4\n' +
'1 2 3 4\n' +
'1 2 3 4\n';

var compiler = misc.pipeline(lexer, rewriter, parser)

try {
  var result = compiler(input)
  console.log(util.inspect(result, false, 100))
} catch (e) {
  console.error(e.message)
}

