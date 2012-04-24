var SemanticAnalyzer = module.exports = function() {
  this.scopeStack = [{ variables: {} }]
}

/**
 * Add a new name to the current scope
 * @param {String} name  The name
 * @param {Type} type    The type
 * @param {Number} line  The line of code on which the name was declared
 * @returns `undefined` on success, or the conflicted name information on error
 */
SemanticAnalyzer.prototype.addToScope = function(name, type, line) {
  if (this.scopeStack[this.scopeStack.length - 1].variables[name]) {
    return this.scopeStack[this.scopeStack.length - 1].variables[name]
  } else {
    this.scopeStack[this.scopeStack.length - 1].variables[name] = { type: type, line: line } 
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
    if (SemanticAnalyzer.rules[type]) {
      SemanticAnalyzer.rules[type].call(semantics, this)
    }
  }
  WrappedSymbol.prototype = Symbol.prototype
  
  return WrappedSymbol
}

SemanticAnalyzer.rules = {
  
}