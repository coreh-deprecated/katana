var misc = require('./misc')

var removeCommentsAndWhitespace = function(tokens) {
  var result = []
  for (var i = 0; i < tokens.length; i++) {
    if (!tokens[i].is(['comment', 'whitespace'])) {
      result.push(tokens[i])
    }
  }
  return result
}

var removeDuplicatedNewLines = function(tokens) {
  var result = []
  var lastType = null
  for (var i = 0; i < tokens.length; i++) {
    if (tokens[i].is('newline') && lastType == 'newline') {
      // omit token
    } else {
      result.push(tokens[i])
    } 
    lastType = tokens[i].type
  }
  return result
}

var rewriter = misc.pipeline(removeCommentsAndWhitespace, removeDuplicatedNewLines)

exports = module.exports = rewriter