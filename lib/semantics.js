var Type = require('./type')

var KatanaError = require('./misc').KatanaError

var SemanticAnalyzer = module.exports = function(errors) {
  this.errors = errors
  this.scopeStack = [{ variables: {} }]
  this.currentSymbol = null
}

/**
 * Add a new name to the current scope
 * @param {String} name  The name
 * @param {Type} type    The type
 * @param {Number} line  The line of code on which the name was declared
 * @returns `undefined` on success, or the conflicted name information on error
 */
SemanticAnalyzer.prototype.addToScope = function(name, type, line, column) {
  if (this.scopeStack[this.scopeStack.length - 1].variables[name]) {
    return this.scopeStack[this.scopeStack.length - 1].variables[name]
  } else {
    this.scopeStack[this.scopeStack.length - 1].variables[name] = { type: type, line: line, column: column }
  }
}

/**
 * Searches in the scope stack for a name, starting from the topmost scope.
 * Returns the information associated with the name
 */
SemanticAnalyzer.prototype.scopeSearch = function(name) {
  for (var i = this.scopeStack.length - 1; i >= 0; i--) {
    if (this.scopeStack[i].variables[name]) {
      return this.scopeStack[i].variables[name]
    }
  }
}

/**
 * Add a new scope to the scope stack
 */
 
SemanticAnalyzer.prototype.pushScope = function() {
  this.scopeStack.push({ variables: {} })
}

/**
 * Remove the topmost scope from the scope stack and return it
 */
 
SemanticAnalyzer.prototype.popScope = function() {
  return this.scopeStack.pop()  
}

/**
 * Wraps the Symbol constructor into a special function that executes semantic
 * rules.
 */
SemanticAnalyzer.prototype.wrapSymbolConstructor = function(Symbol) {
  var semantics = this
  var WrappedSymbol = function(type, options) {
    Symbol.call(this, type, options)
    if (semantics.rules[type]) {
      semantics.currentSymbol = this
      try {
        semantics.rules[type].call(this, semantics)
      } catch (err) {
        if (err.name !== 'KatanaError') { throw err }
        semantics.errors.push(err)
      }
      semantics.currentSymbol = null
    }
  }
  WrappedSymbol.prototype = Symbol.prototype
  
  return WrappedSymbol
}

SemanticAnalyzer.prototype.error = function(msg, line, column) {
  if (typeof line === 'undefined') {
    var symbol = this.currentSymbol
    line = symbol.line
    column = symbol.column
  }
  var error = new KatanaError('semantic', 'error', msg, line, column, column)
  this.errors.push(error)
}

SemanticAnalyzer.prototype.note = function(msg, line, column) {
  if (typeof line === 'undefined') {
    var symbol = this.currentSymbol
    line = symbol.line
    column = symbol.column
  }
  var note = new KatanaError('semantic', 'note', msg, line, column, column)
  this.errors.push(note)
}

SemanticAnalyzer.prototype.rules = {
  'type': function() {
    // Primitive types
    if (this.children.length == 1) {
      var typeName = this.children[0].value.slice(1)
      this.meta.type = new Type(typeName)
    }
    
    // Pointers
    else if (this.children[0].type == 'multiplication operator') {
      this.meta.type = new Type('*', this.children[1].meta.type)
    }
    
    // Functions
    else if (this.children[1].type == 'type list') {
      var subTypes = this.children[1].children.map(function(symbol) { return symbol.meta.type })
      subTypes.unshift(this.children[0].meta.type)
      this.meta.type = new Type('function', subTypes) 
    }
  },
  'declaration': function(semantics) {
    var name = this.children[0].value
    var other
    if (other = semantics.addToScope(name, this.meta.type, this.line, this.column)) {
      semantics.error('Redeclaration of `' + name + '`.')
      semantics.note('Previous declaration is here.', other.line, other.column)
    }
  }
}