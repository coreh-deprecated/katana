var error = require('./error')

/**
 * Lexer
 */ 
var lexer = exports = module.exports = function(string) {
  // Split the input in lines
  var lines = string.split('\n')
  // Process each line
  var i = 1
  return lines.map(function(line){
    return new Line(line, i++)
  })
}

/**
 * A token in the input file
 */
var Token = exports.Token = function(value, type, position) {
  this.value = value
  this.type = type
  this.position = position
}

/**
 * A line in the input file
 */
var Line = exports.Line = function(value, number, tokens, indentation) {
  // The line number
  this.number = number
  
  // The string value of the line. First consumed by this function
  // but later restored to the initial state
  this.value = value
  
  // Are we manually initializing the line with tokens?
  if (typeof tokens !== 'undefined') {
    // Yes, just assign tokens and indentation
    this.tokens = tokens
    this.indentation = indentation
    
  } else {
    // No, start with an empty token array and figure out the tokens
    this.tokens = []
    
    // The current position in the line (used for processing)
    this.position = 1
    
    // Figure the indentation level of the line
    this.indentation = this.eat({ whitespace: /^\s*/ }).value.length
  
    // Eat tokens
    while (this.value.length) {
      var token = this.eat({
        whitespace: /^\s+/
      , number: /^[0-9]+/
      , string: /^\"[^\"]*\"/
      , semicolon: /^;/
      , open: /^(\{|\(|\[)/
      , close: /^(\}|\)|\])/
      })
      if (!token.type) {
        // Restore original value
        this.value = value

        error.throw('Lexical', 'Unexpected character', this, this.position)

      } else {
        this.tokens.push(token)
      }
    }
    // Restore original value
    this.value = value
  
    // Remove position member
    delete this.position
  }
}

/**
 * Try to match regexps to the line, and return the longest
 * match, wrapped in a Token object
 */
Line.prototype.eat = function(possibleTokens) {
  // The best (longest) token so far and its type
  var best = '', type = null
  
  // Iterate through all regexps
  for (var tokenName in possibleTokens) {
    var regexp = possibleTokens[tokenName]
    var match = this.value.match(regexp)
    if (match) {
      var current = match[0]
      if (current.length > best.length) {
        // If there's a match and it's the best so far,
        // store it
        best = current
        type = tokenName
      }
    }
  }
  
  // Create the token object
  var result = new Token(best, type, this.position)

  // Eat up the line value
  this.value = this.value.substr(best.length)

  // Increment the position variable
  this.position += best.length
  
  return result


}