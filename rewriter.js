var misc = require('./misc')
var lexer = require('./lexer')

var removeWhitespace = function(lines) {
  lines.forEach(function(line) {
    line.tokens = line.tokens.filter(function(token) {
      return token.type != 'whitespace'
    })
  })
  return lines
}

var removeComments = function(lines) {
  lines.forEach(function(line) {
    line.tokens = line.tokens.filter(function(token) {
      return token.type != 'comment'
    })
  })
  return lines
}

var removeEmptyLines = function(lines) {
  return lines.filter(function(line) {
    return line.tokens.length != 0
  })
}

var splitLinesOnSemiColons = function(lines) {
  return misc.unfold(lines, function(line) {
    var tokensArrayArray = misc.split(line.tokens, function(token) {
      return token.type == 'semicolon'
    })
    return tokensArrayArray.map(function(tokensArray) {
      return new lexer.Line(line.value, line.number, tokensArray, line.indentation)
    })
  })
}

/**
 * Rewriter - Performs transformations in the stream provided by the
 *            lexer to ease parsing.
 */
exports = module.exports = misc.pipeline(removeWhitespace,
                                         removeComments,
                                         splitLinesOnSemiColons,
                                         removeEmptyLines)