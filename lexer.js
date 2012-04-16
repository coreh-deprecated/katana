var keywords = ['if', 'else', 'while', 'for'
               ,'take', 'return'
               ,'true', 'false', 'yes', 'no', 'on', 'off'
               ,'null'
               ,'undefined'
               ,'var' 
               ,'void'
               ,'int', 'int8', 'int16', 'int32', 'int64'
               ,'uint', 'uint8', 'uint16', 'uint32', 'uint64'
               ,'float', 'float32', 'float64'
               ,'struct']

/**
 * Token definitions
 */
var tokens = {
  'whitespace': /^[^\S\n]/
, 'newline': /^(\r|\n|\r\n)/
, 'comment': /^(\/\/.*|\/\*[\s\S]*?\*\/)/
, 'identifier': /^[\_\$a-zA-Z][\_\$a-zA-Z0-9]*/
, 'keyword': new RegExp('^\\\\('+keywords.join('|')+')')
, 'string literal': /^\"((\\.|[^\"])*)\"|^\'((\\.|[^\'])*)\'/
, 'number literal': /^(0|[1-9][0-9]*)(\.[0-9]+)?((e|E)(\+|\-)[0-9]+)?/
, 'assignment operator': /^(\+|\-|\*|\/|\%|\&|\&\&|\||\|\|\>\>|\<\<|\^|\^\^|\:|)(\=)/
, 'logical or operator': /^\|\|/
, 'logical xor operator': /^\^\^/
, 'logical and operator': /^\&\&/
, 'bitwise or operator': /^\|\|/
, 'bitwise xor operator': /^\^\^/
, 'bitwise and operator': /^\&\&/
, 'prototype operator': /^\:\:/
, 'equality operator': /^(\=\=|\!\=)/
, 'relational operator': /^(\>\=|\<\=|\>|\<)/
, 'shift operator': /^(\>\>|\<\<)/
, 'addition operator': /^(\+|\-)/
, 'multiplication operator': /^(\*|\/|\%)/
, 'bang': /^\!/
, 'tilde': /^\~/
, 'increment operator': /^(\+\+|\-\-)/
, 'dot': /^\./
, 'comma': /^\,/
, 'square bracket': /^(\[|\])/
, 'curly bracket': /^(\{|\})/
, 'paren': /^(\(|\))/
, 'colon': /^\:/
, 'semicolon': /^\;/
, 'invalid': /^[\s\S]/
}

/**
 * Represents a Symbol in the parse tree
 * @param {String} type      The symbol type
 * @param {String} value     The symbol value
 * @param {String} children  The symbol's children (optional)
 * @param {Number} line      The symbol's line (optional)
 * @param {Number} column    The symbol's column (optional)
 */
var Symbol = function(type, value, children, line, column) {
  this.type = type
  this.value = value
  this.line = line
  this.column = column
  if (typeof children === 'undefined') {
    this.children = []
  } else {
    this.children = children
    if (children.length > 0) {
      if (typeof line === 'undefined') {
        this.line = this.children[0].line
        this.column = this.children[0].column
      }
    }
  }
}

/**
 * Checks if a Symbol is of a given type. Optionally check its value.
 * @param {String} type                   The symbol type
 * @param {String,Regexp,Function} value  The symbol value (optional)
 */
Symbol.prototype.is = function(type, value) {
  if (type instanceof Array) {
    if (type.indexOf(this.type) === -1) {
      return false
    }
  } else {
    if (type !== '*' && type !== this.type) {
      return false
    }
  }
  if (typeof value !== 'undefined') {
    if (typeof value === 'string' || value instanceof String) {
      return this.value === value
    } else if (value instanceof RegExp) {
      return !!this.value.match(value)
    } else if (value instanceof Function) {
      return !!value(this.value)
    } else {
      return false
    }
  }
  return true
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
    
    var symbol = new Symbol(bestToken.type, bestToken.value, [], line, column)

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
    result.push(new Symbol('newline', '\n', [], line, column))
  }
  
  result.push(new Symbol('end of file', '', [], line, column))
  
  return result
}


/**
 * Exports
 */
exports = module.exports = lexer
exports.Symbol = Symbol
exports.keywords = keywords