var misc = require('./misc')
var Symbol = require('./lexer').Symbol
var KatanaError = require('./misc').KatanaError

var write = function(tokens) {
  var result = ''
  for (var i = 0; i < tokens.length; i++) {
    result += tokens[i].value
  }
  console.log(result)
}

var transformOffsideOperator = function(previous) {
  var tokens = previous.tokens
  var errors = previous.errors
  var opposing = { '{': '}', '[': ']', '(': ')' }
  var i = 0
  var result = []
  var indent = 0
  var transformOffsideOperatorUnknown = function() {
    result.push(new Symbol('curly bracket', '{', [], tokens[i].line, tokens[i].column, { generatedByOffside: true }))
    i++
    for (; i < tokens.length; i++) {
      if (tokens[i].is('whitespace')) {
        // ignore
      } else if (tokens[i].is('newline')) {
        transformOffsideOperatorMultiline(indent)
        break;
      } else {
        transformOffsideOperatorInline()
        break;
      }
    }
    result.push(new Symbol('curly bracket', '}', [], tokens[i].line, tokens[i].column, { generatedByOffside: true }))
  }
  var transformOffsideOperatorInline = function() {
    var startLine = tokens[i].line
    var startColumn = tokens[i].column
    var brackets = []
    for (; i < tokens.length; i++) {
      if (tokens[i].is('newline') && (brackets.length == 0 || tokens[i+1].is('end of file'))) {
        if (brackets.length > 0) {
          errors.push(new KatanaError('offside', 'error', 'Unmatched braces inside offside block.', startLine, startColumn, 1))
        }
        i--
        return
      } else if (tokens[i].is('offside operator')) {
        transformOffsideOperatorUnknown()
      } else {
        if (tokens[i].is(['square bracket', 'curly bracket', 'paren'])) {
          if (tokens[i].value.match(/\[|\{|\(/)) {
            brackets.push(tokens[i].value)
          } else {
            if (brackets.length == 0) {
              i--
              return
            } else {
              var expected = opposing[brackets.pop()]
              if (expected != tokens[i].value) {
                errors.push(new KatanaError('syntax', 'error', 'Mismatched braces.', tokens[i].line, tokens[i].column, 1))
              }
            }
          }
        } 
        result.push(tokens[i])
      }
    }    
  }
  var transformOffsideOperatorMultiline = function(closingIndent) {
    var startLine = tokens[i].line
    var startColumn = tokens[i].column
    var brackets = []
    for (; i < tokens.length; i++) {
      // Detect indents
      if (tokens[i].is('newline')) {
        result.push(tokens[i])
        if (tokens[i+1].is('whitespace')) {
          i++
          result.push(tokens[i])
          indent = tokens[i].value.length
        } else {
          indent = 0
        }
      } else {
        if (indent <= closingIndent) {
          if (brackets.length > 0) {
            if (closingIndent != -1) {
              errors.push(new KatanaError('offside', 'error', 'Unmatched braces inside offside block.', startLine, startColumn, 1))
            } else {
              errors.push(new KatanaError('syntax', 'error', 'Unmatched braces.', startLine, startColumn, 1))
            }
          }
          while(!tokens[i--].is('newline')) { }
          return
        }
        if (tokens[i].is('offside operator')) {
          transformOffsideOperatorUnknown()
        } else {
          if (tokens[i].is(['square bracket', 'curly bracket', 'paren'])) {
            if (tokens[i].value.match(/\[|\{|\(/)) {
              brackets.push(tokens[i].value)
            } else {
              if (brackets.length == 0) {
                i--
                return
              } else {
                var expected = opposing[brackets.pop()]
                if (expected != tokens[i].value) {
                  errors.push(new KatanaError('syntax', 'error', 'Mismatched braces.', tokens[i].line, tokens[i].column, 1))
                }
              }
            }
          }
          result.push(tokens[i])
        }
      }
    }
  }
  transformOffsideOperatorMultiline(-1)
  return { tokens: result, errors: errors }
}

var removeCommentsAndWhitespace = function(previous) {
  var tokens = previous.tokens
  var errors = previous.errors
  var result = []
  for (var i = 0; i < tokens.length; i++) {
    if (!tokens[i].is(['comment', 'whitespace'])) {
      result.push(tokens[i])
    }
  }
  return { tokens: result, errors: errors }
}

var removeDuplicatedNewLines = function(previous) {
  var tokens = previous.tokens
  var errors = previous.errors
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
  return { tokens: result, errors: errors }
}

var rewriter = misc.pipeline(transformOffsideOperator, removeCommentsAndWhitespace, removeDuplicatedNewLines)

exports = module.exports = rewriter