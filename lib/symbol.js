/**
 * Represents a Symbol in the parse tree
 * @param {String} type      The symbol type
 * @param {Object} options   The token options: type, value, 
 *                           children, line, column and metadata
 */
var Symbol = module.exports = function(type, options) {
  this.type = type
  this.value = options.value
  this.line = options.line
  this.column = options.column
  this.meta = options.meta || {}
  this.children = options.children || []
  // Automatically set line and column based on first child token
  if (typeof this.line === 'undefined' && this.children.length > 0) {
    this.line = this.children[0].line
    this.column = this.children[0].column
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