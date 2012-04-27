var Type = require('./type')
var misc = require('./misc')
var KatanaError = misc.KatanaError

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
    this.scopeStack[this.scopeStack.length - 1].variables[name] = { name: name, type: type, line: line, column: column }
  }
}

/**
 * Report to the semantic analyzer about the return type of the current scope
 * @param {Type} type  The reported return type
 */
SemanticAnalyzer.prototype.reportReturnType = function(type) {
  var scope = this.scopeStack[this.scopeStack.length - 1]
  
  // If no type was reported before, simply set the scope type
  if (!scope.type) {
    scope.type = type
  } else {
    // If a type was already reported, figure out the interaction between the
    // previously reported type and the newly reported one
    scope.type = Type.interact(scope.type, type)
    
    // If an interaction was not possible, default to var (since var can hold
    // values of any type)
    if (!scope.type) {
      scope.type = new Type('var')
    }
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
 * Searches in the scope stack for a name, using the Levenshtein distance to 
 * find approximate matches. (Useful for "Did you mean"-style suggestions)
 *
 * Returns the information associated with the best match.
 */
SemanticAnalyzer.prototype.approximateScopeSearch = function(name, max) {
  var bestDistance = max + 1
  var bestResult
  for (var i = this.scopeStack.length - 1; i >= 0; i--) {
    for (var thisName in this.scopeStack[i].variables) {
      var distance = misc.levenshteinDistance(thisName, name)
      if (distance < bestDistance) {
        bestResult = this.scopeStack[i].variables[thisName]
        bestDistance = distance
      }
    }
  }
  return bestResult
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

/**
 * Reports a semantic error. Error line and column are inferred if not provided.
 * @param {String} msg     The error message
 * @param {Number} line    (optional) The line where the error occurred.
 * @param {Number} column  (optional) The column where the error occurred.
 */

SemanticAnalyzer.prototype.error = function(msg, line, column) {
  if (typeof line === 'undefined') {
    var symbol = this.currentSymbol
    line = symbol.line
    column = symbol.column
  }
  var error = new KatanaError('semantic', 'error', msg, line, column, column)
  this.errors.push(error)
}

/**
 * Reports a semantic note. Note line and column are inferred if not provided.
 * @param {String} msg     The error message
 * @param {Number} line    (optional) The line where the error occurred.
 * @param {Number} column  (optional) The column where the error occurred.
 */

SemanticAnalyzer.prototype.note = function(msg, line, column) {
  if (typeof line === 'undefined') {
    var symbol = this.currentSymbol
    line = symbol.line
    column = symbol.column
  }
  var note = new KatanaError('semantic', 'note', msg, line, column, column)
  this.errors.push(note)
}

SemanticAnalyzer.prototype.checkOperand = function(symbol, operation) {
  var type = symbol.meta.type
  if (!type.is(Type.operand[operation])) {
    var message = 'Cannot perform ' + operation + ' with operand of type `' + symbol.meta.type + '`.'
    this.error(message, symbol.line, symbol.column)
  }
}

SemanticAnalyzer.prototype.checkTypeInteraction = function(leftSymbol, rightSymbol, operatorSymbol) {
  var type1 = leftSymbol.meta.type
  var type2 = rightSymbol.meta.type
  var type = Type.interact(type1, type2)
  if (!type) {
    // Use `var` by default to suppress further errors,
    // since var can be used in any operation
    type = new Type('var') 
    var line = operatorSymbol.line
    var column = operatorSymbol.column
    if (type1.canCastTo(type2)) { 
      var message = 'Cannot convert implicitly between types `' + type1 + '` and `' + type2 + '` without data loss.'
      this.error(message, line, column)
      this.note('Use a typecast to perform the conversion explicity.', rightSymbol.line, rightSymbol.column)
    } else {
      var message = 'Cannot convert between types `' + type1 + '` and `' + type2 + '`.'        
      this.error(message, line, column)
    }
  }
  return type
}

SemanticAnalyzer.prototype.checkAssignment = function(leftSymbol, rightSymbol, operatorSymbol) {
  var type1 = leftSymbol.meta.type
  var type2 = rightSymbol.meta.type
  if (!type2.canPromoteTo(type1)) {
    if (type2.canCastTo(type1)) {
      var message = 'Cannot assign `' + type2 + '` into `' + type1 + '` without data loss.'
      this.error(message, operatorSymbol.line, operatorSymbol.column)
      this.note('Use a typecast to perform the conversion explicity.', rightSymbol.line, rightSymbol.column)
    } else {
      var message = 'Cannot assign `' + type2 + '` into `' + type1 + '`.'
      this.error(message, operatorSymbol.line, operatorSymbol.column)
    }
  }
}
/**
 * Semantic rule definitions
 */
SemanticAnalyzer.prototype.rules = {
  
  'return statement': function(semantics) {
    if (this.children.length == 1) {
      semantics.reportReturnType(this.children[0].meta.type)
    } else {
      semantics.reportReturnType(new Type('void'))
    }
  },
  
  'type': function() {
    // Primitive types
    if (this.children.length == 1) {
      var typeName = this.children[0].value.slice(1)
      this.meta.type = new Type(typeName)
    }
    
    // Pointers
    else if (this.children[0].type == 'multiplication operator') {
      this.meta.type = new Type('pointer', [this.children[1].meta.type])
    }
    
    // Functions
    else if (this.children[1].type == 'type list') {
      var subTypes = this.children[1].children.map(function(symbol) { return symbol.meta.type })
      subTypes.unshift(this.children[0].meta.type)
      this.meta.type = new Type('function', subTypes) 
    }
  },
  
  'declaration': function(semantics) {
    if (!this.meta.type) {
      this.meta.type = new Type('var')
    }
    var name = this.children[0].value
    var other
    if (other = semantics.addToScope(name, this.meta.type, this.line, this.column)) {
      semantics.error('Redeclaration of `' + name + '`.')
      semantics.note('Previous declaration is here.', other.line, other.column)
    }
    if (this.children.length == 3) {
      semantics.checkAssignment(this, this.children[2], this.children[1])
    }
  },
  
  'variable': function(semantics) {
    var name = this.children[0].value
    var info
    if (info = semantics.scopeSearch(name)) {
      this.meta.type = info.type
    } else {
      semantics.error('Use of undeclared identifier `' + name + '`.')
      
      // Try to suggest the correct spelling of a variable name. 
      // Allow 1 character + roughly 10% of difference between the names
      info = semantics.approximateScopeSearch(name, 1 + Math.round(name.length * 0.1))
      if (info) {
        semantics.note('Did you mean `' + info.name + '`, declared here?', info.line, info.column)
      }
      
      this.meta.type = new Type('var')
    }
    this.meta.addressable = true
    this.meta.assignable = true
  },
  
  'constant': function(semantics) {
    switch(this.value) {
      case '\\NaN': case '\\infinity': this.meta.type = new Type('float32'); break
      case '\\undefined': this.meta.type = new Type('void'); break
      case '\\null': this.meta.type = new Type('pointer', [new Type('void')]); break
      case '\\yes': case '\\no':
      case '\\true': case '\\false':
      case '\\on': case '\\off': 
        this.meta.type = new Type('bool'); break
    }
  },
  
  'number literal': function(semantics) {
    if (this.value.match(/\.|e/)) {
      this.meta.type = new Type('float32')
    } else {
      var value = parseInt(this.value, 10)
      // Restrict integer literals to maxof.uint32 to avoid running into static
      // analysis isssues due to how numbers are represented in JavaScript
      if (value > Type.maxof.uint32) {
        semantics.error('Integer literal above maximum size supported by implementation.')
        this.meta.type = new Type('var')
      } else {
        this.meta.type = new Type('uint='+value) 
      }
    }
  },
  
  'string literal': function(semantics) {
    this.meta.type = new Type('var')
  },
  
  'object literal': function(semantics) {
    this.meta.type = new Type('var')
  },

  'array literal': function(semantics) {
    this.meta.type = new Type('var')
  },
  
  'function literal': function(semantics) {
    var subtypes = [this.meta.scope.type || new Type('var')]
    
    if (this.children.length == 2) {
      var declarationList = this.children[0]
      for (var i = 0; i < declarationList.children.length; i++) {
        subtypes.push(declarationList.children[i].meta.type)
      }
    }
    
    this.meta.type = new Type('function', subtypes)
  },
  
  'typecast': function(semantics) {
    var to = this.children[0].meta.type
    var from = this.children[1].meta.type
    if (!from.canCastTo(to)) {
      semantics.error('Cannot cast from `' + from + '` to `' + to + '`.')
    }
    this.meta.type = to
  },
  
  'expression': function(semantics) {
    this.meta.type = this.children[this.children.length - 1].meta.type
  },
  
  'assignment expression': function(semantics) {
    var operation
    switch (this.children[0].value) {
      case '&&=': case '^^=': case '||=': operation = 'logical'; break
      case '&=': case '^=': case '|=': operation = 'bitwise'; break
      case '>>=': case '<<=': operation = 'bitshift'; break
      case '+=': case '-=': operation = 'addition'; break
      case '*=': case '%=': case '/=': operation = 'multiplication'; break
    }
    if (operation) {
      semantics.checkOperand(this.children[0], operation)
      semantics.checkOperand(this.children[2], operation)
    }
    semantics.checkAssignment(this.children[0], this.children[2], this.children[1])
    this.meta.type = this.children[0].meta.type
  },
  
  'logical expression': function(semantics) {    
    semantics.checkOperand(this.children[0], 'logical')
    semantics.checkOperand(this.children[2], 'logical')
    this.meta.type = semantics.checkTypeInteraction(this.children[0], this.children[2], this.children[1])
  },
  
  'bitwise expression': function(semantics) {    
    semantics.checkOperand(this.children[0], 'bitwise')
    semantics.checkOperand(this.children[2], 'bitwise')
    this.meta.type = semantics.checkTypeInteraction(this.children[0], this.children[2], this.children[1])
  },

  'equality expression': function(semantics) {    
    semantics.checkTypeInteraction(this.children[0], this.children[2], this.children[1])
    this.meta.type = new Type('bool')
  },

  'relational expression': function(semantics) {    
    var operation = 'comparison'
    semantics.checkOperand(this.children[0], 'relational')
    semantics.checkOperand(this.children[2], 'relational')
    semantics.checkTypeInteraction(this.children[0], this.children[2], this.children[1])
    this.meta.type = new Type('bool')
  },

  'bitshift expression': function(semantics) {    
    semantics.checkOperand(this.children[0], 'bitshift')
    semantics.checkOperand(this.children[2], 'bitshift')
    this.meta.type = this.children[0].meta.type
  },

  'addition expression': function(semantics) {    
    if (this.children[0].meta.type.is('pointer')) {
      semantics.checkOperand(this.children[2], 'pointer arithmetic')
      this.meta.type = this.children[0].meta.type
    } else {
      semantics.checkOperand(this.children[0], 'addition')
      semantics.checkOperand(this.children[2], 'addition')
      this.meta.type = semantics.checkTypeInteraction(this.children[0], this.children[2], this.children[1])
    }
  },
  
  'multiplication expression': function(semantics) {
    semantics.checkOperand(this.children[0], 'multiplication')
    semantics.checkOperand(this.children[2], 'multiplication')
    this.meta.type = semantics.checkTypeInteraction(this.children[0], this.children[2], this.children[1])
  },
  
  'unary expression': function(semantics) {
    switch (this.children[0].value) {
    case '+':
      semantics.checkOperand(this.children[1], 'addition')
      this.meta.type = this.children[1].meta.type
      break;
    case '-':
      semantics.checkOperand(this.children[1], 'addition')
      if (this.children[1].meta.type.is('int', 'uint') && this.children[1].meta.type.value()) {
        this.meta.type = new Type(this.children[1].meta.type.family() + '=' + (-this.children[1].meta.type.value()))
      } else {
        this.meta.type = this.children[1].meta.type
      }
      break
    case '~':
      semantics.checkOperand(this.children[1], 'bitwise')
      this.meta.type = this.children[1].meta.type
      break;
    case '*':
      if (!this.children[1].meta.type.is('pointer', 'var')) {
        semantics.error('Cannot dereference a non-pointer value.')
        this.meta.type = new Type('var')
      } else if (this.children[1].meta.type.subtypes[0].is('void')) {
        semantics.error('Cannot dereference a void pointer.') 
        this.meta.type = new Type('var')
      } else {
        this.meta.type = this.children[1].meta.type.subtypes[0]
      }
      this.meta.addressable = true
      this.meta.assignable = true
      break;
    case '&':
      if (!this.children[1].meta.addressable) {
        semantics.error('Cannot use `&` operator. Value lacks a memory address.')
        this.meta.type = new Type('var')
      } else {
        this.meta.type = new Type('pointer', [this.children[1].meta.type])
      }
      break;
    }
  }
}