var misc = require('./misc')

var lexer = require('./lexer')
var rewriter = require('./rewriter')
var parser = require('./parser')

var compiler = module.exports = misc.pipeline(lexer, rewriter, parser)


