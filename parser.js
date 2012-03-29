var error = require('./error')
var misc = require('./misc')
var lexer = require('./lexer')

var findBlocks = function(lines) {
  var level = lines[0].indentation
  var result = []
  var temp = []
  for (var i = 0; i < lines.length; i++) {
    if (lines[i].indentation == level) {
      if (temp.length > 0) {
        result.push(findBlocks(temp))
        temp = []
      }
      result.push(lines[i])
    } else if (lines[i].indentation > level) {
      temp.push(lines[i])
    } else {
      error.throw('Parse', 'Expected ' + level + ' or more spaces of indentation, found ' + misc.pluralize(lines[i].indentation, 'space', 'spaces'), lines[i], lines[i].indentation + 1)
    }
  }
  if (temp.length > 0) {
    result.push(findBlocks(temp))
    temp = []
  }
  return result
}

var findBraces = function(lines) {
  
  var oposites = { '(' : ')', '[' : ']', '{' : '}' }
  var symbolNames = { '}' : 'object', ']': 'array', ')': 'tuple'}
  
  var find = function(line, symbol, pos) {
    var result = []
    
    // Iterate throught the line tokens
    for (var i = pos; i < line.tokens.length; i++) {
      var token = line.tokens[i]

      // Did we find an opening brace?
      if (token.type == 'open') {
        
        // Recursively find braces
        var found = find(line, oposites[token.value], i+1)
        result.push(found[0])
        i = found[1]
      } 
      
      // Did we find a closing brace?
      else if (token.type == 'close') {
        
        // The brace was the one expected
        if (token.value == symbol) {
          return [new lexer.Token(result, symbolNames[symbol], line.tokens[pos].position), i]
        } 
        
        // The brace was not expected
        else {
          
          // We expected some other brace
          if (symbol) {
            error.throw('Parse', 'Expected `' + symbol + '`, found `' + token.value + '`', line, token.position)
          } 
          
          // We expected no braces
          else {
            error.throw('Parse', 'Found unexpected symbol `' + token.value + '`', line, token.position)
          }
        }
      } 
      
      // The token is not a brace
      else {
        result.push(token)
      }
    }
    // We got to the end of line
    // Were we expecting a brace?
    if (symbol) {
      error.throw('Parse', 'Expected `' + symbol + '`, found end of line', line, line.value.length)
    }
    // No, we were not expecting a brance
    else {
      return result
    }
  }
  return lines.map(function(line){
    if (line instanceof Array) {
      return findBraces(line)
    } else {
      return new lexer.Line(line.value, line.number, find(line, null, 0), line.indentation)
    }
  })
}

var parser = module.exports = misc.pipeline(findBlocks, findBraces)