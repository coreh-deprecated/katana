/**
 * Module Dependencies
 */
var KatanaError = require('./misc').KatanaError
var Symbol = require('./symbol')

/**
 * Keyword Definitions
 */
var controlKeywords = ['if', 'else', 'while', 'for', 'break', 'continue']

var functionKeywords = [ 'take', 'do', 'return' ]

var constantKeywords = [ 'true', 'false', 'yes', 'no', 'on', 'off', 'null', 'undefined', 'NaN', 'infinity', 'this' ]

var typeKeywords = ['var'
                   ,'void'
                   ,'int', 'int8', 'int16', 'int32', 'int64'
                   ,'uint', 'uint8', 'uint16', 'uint32', 'uint64'
                   ,'float', 'float32', 'float64'
                   ,'bool'
                   ,'struct']

var moduleKeywords = [ 'import', 'export', 'from' ]

var operatorKeywords = [ 'new', 'in', 'sizeof', 'instanceof' ]
                   
var keywords = [].concat(controlKeywords, functionKeywords, constantKeywords, typeKeywords, moduleKeywords, operatorKeywords)

/**
 * Token definitions
 */
var tokens = {
  'whitespace': /^[^\S\n]+/
, 'newline': /^(\r|\n|\r\n)/
, 'comment': /^(\/\/.*|\/\*[\s\S]*?\*\/)/
, 'identifier': /^[\_\$a-zA-Z][\_\$a-zA-Z0-9]*/
, 'keyword': new RegExp('^\\\\('+keywords.join('|')+')')
, 'string literal': /^\"((\\.|[^\"])*)\"|^\'((\\.|[^\'])*)\'/
, 'number literal': /^(0|[1-9][0-9]*)(\.[0-9]+)?((e|E)(\+|\-)[0-9]+)?/
, 'assignment operator': /^(\+|\-|\*|\/|\%|\&|\&\&|\||\|\|\>\>|\<\<|\^|\^\^|)(\=)/
, 'logical or operator': /^\|\|/
, 'logical xor operator': /^\^\^/
, 'logical and operator': /^\&\&/
, 'bitwise or operator': /^\|/
, 'bitwise xor operator': /^\^/
, 'bitwise and operator': /^\&/
, 'prototype operator': /^\:\:/
, 'equality operator': /^(\=\=|\!\=)/
, 'relational operator': /^(\>\=|\<\=|\>|\<)/
, 'bitshift operator': /^(\>\>|\<\<)/
, 'addition operator': /^(\+|\-)/
, 'multiplication operator': /^(\*|\/|\%)/
, 'bang': /^\!/
, 'tilde': /^\~/
, 'increment operator': /^(\+\+|\-\-)/
, 'dot': /^\./
, 'comma': /^\,/
, 'square bracket': /^(\[|\])/
, 'curly bracket': /^(\{|\})/
, 'offside operator': /^\-\>/
, 'paren': /^(\(|\))/
, 'colon': /^\:/
, 'semicolon': /^\;/
, 'invalid': /^[\s\S]/
}

/**
 * Transforms a string into a token stream
 */
var lexer = function (code) {
  var result = []
    , match
    , value
    , bestToken = { type: 'invalid', value: '' }
    , line = 1
    , column = 1
    , errors = []
    
  while (code) {
    bestToken = { type: 'invalid', value: '' }
    for (tokenType in tokens) {
      match = code.match(tokens[tokenType])
      if (match) {
        value = match[0]
        if (value.length > bestToken.value.length) {
          bestToken.type = tokenType
          bestToken.value = value
        }
      }
    }
    
    var symbol = new Symbol(bestToken.type, { value: bestToken.value, line: line, column: column })
    
    if (symbol.is('invalid')) {
      errors.push(new KatanaError('lexical', 'error', 'Invalid token.', line, column, column + symbol.value.length))
    }

    result.push(symbol)
    
    code = code.slice(bestToken.value.length)
    
    if (symbol.is('newline')) {
      column = 1
      line++
    } else {
      column += bestToken.value.length
    }
  }
  
  if (bestToken.type != 'newline') {
    // Add missing newline
    result.push(new Symbol('newline', { value: '\n', line: line, column: column }))
  }
  
  result.push(new Symbol('end of file', { value: '', line:line, column: column }))
  
  return { tokens: result, errors: errors }
}


/**
 * Exports
 */
exports = module.exports = lexer
exports.keywords = keywords
exports.controlKeywords = controlKeywords
exports.functionKeywords = functionKeywords
exports.constantKeywords = constantKeywords
exports.typeKeywords = typeKeywords
exports.moduleKeywords = moduleKeywords
exports.operatorKeywords = operatorKeywords
