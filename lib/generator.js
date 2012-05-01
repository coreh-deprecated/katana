var uuid = require('node-uuid')

/**
 * Represents C code generated from a symbol in the syntax tree
 */
var Code = function() {
  this.unit = ''
  this.block = ''
  this.inline = ''
}

/**
 * Generates an intermediate representation of the program,
 * in the form of standard C, to be passed to the backend.
 *
 * @param {Object} module  The module provided by the compiler.
 */
var Generator = function(module) {
  this.cTypes = { 'var' : { name: 'struct var_t'
                          , unit: 'struct var_t { long long int data[2]; };'
                          }
                }
  this.functionCasts = {}
  this.uniqueCounts = {}
  this.module = module
}

/**
 * These identifier names cannot be used for variables in the produced code.
 */
Generator.forbiddenIdentifiers = [
  /* C keywords */
  'auto', 'break', 'case', 'char', 'const', 'continue', 'default', 'do',
  'double', 'else', 'enum', 'extern', 'float', 'for', 'goto', 'if', 'int',
  'long', 'register', 'return', 'short', 'signed', 'sizeof', 'static', 'struct',
  'switch', 'typedef', 'union', 'unsigned', 'void', 'volatile', 'while',
  
  /* identifiers used by the compiler */
  'closure', 'parent', 'this'
]

Generator.prototype = {
  /**
   * Takes a katana identifier name and rewrites it so that it's a valid
   * C identifier name
   *
   * @param {String} name
   */
  rewriteName: function(name) {
    if (name.match(/^\_\_/) || Generator.forbiddenIdentifiers.indexOf(name) != -1) {
      return '__' + name
    }
    return name
  },
  
  /**
   * Takes a katana type and works out the equivalent C type
   *
   * @param {Type} type
   */
  toCType: function(type) {
    switch(type.type) {
      // Platform dependent (native) types
      case 'int': return (process.arch == 'x64') ? 'long long int' : 'long int'
      case 'uint': return (process.arch == 'x64') ? 'unsigned long long int' : 'unsigned long int'
      case 'float': return (process.arch == 'x64') ? 'double' : 'float'
      
      // Primitive Types
      case 'int64': return 'long long int'
      case 'int32': return 'long int'
      case 'int16': return 'short int'
      case 'int8': return 'char'
      case 'uint64': return 'unsigned long long int'
      case 'uint32': return 'unsigned long int'
      case 'uint16': return 'unsigned short int'
      case 'uint8': return 'unsigned char'
      case 'float64': return 'double'
      case 'float32': return 'float'
      case 'void': return 'void'
      
      // Pointers
      case 'pointer': return this.toCType(type.subtypes[0]) + '*'
      
      // Functions
      case 'function':
        // Check if we already have a c struct that represents this type
        if (this.cTypes[type]) {
          return this.cTypes[type].name
        } else {
          
          // Mangle the function type to a valid C identifier, and use it as a struct name
          var name = 'struct ' +
            type.toString()
            .replace(/\(/g, 'L') 
            .replace(/\)/g, 'R')
            .replace(/\*/g, 'P')
            .replace(/\,/g, '_') + '_t'
            
          // Recursively figure out the equivalent C types of the function arguments
          var args = []
          for (var i = 1; i < type.subtypes.length; i++) {
            args.push(this.toCType(type.subtypes[i]))
          }
          
          // Handle functions with no arguments
          if (args.length == 0) {
            args.push('void')
          }
          
          // Generate a struct that represents the function type
          var unit = name + '{ void * closure; ' + this.toCType(type.subtypes[0]) + ' (*function) (void *, ' + this.cTypes['var'].name + ', '  + args.join(', ') + '); };';
          
          // Store it and return
          this.cTypes[type] = {
            name: name
          , unit: unit
          }
          return name
        }
        
      // Varying
      case 'var':
        return this.cTypes[type].name
      
      // Literal types (default to largest possible value to avoid data loss)
      default:
        switch (type.family()) {
          case 'uint': return 'unsigned long long int'
          case 'int': return 'long long int'
        }
    }
  },
  
  /**
   * Generates an unique name for a specific role in the generated program
   *
   * @param {String} role
   */
  uniqueName: function(role) {
    if (typeof this.uniqueCounts[role] === 'undefined') {
      this.uniqueCounts[role] = 0
    }
    return role + '_' + this.uniqueCounts[role]++
  },
  
  /**
   * Generate a #line C preprocessor directive to allow for source line mapping
   *
   * @param {Symbol} symbol
   */
  lineMapping: function(symbol) {
    return '\n#line ' + symbol.line + ' "' + this.module.path + '"\n'
  },
  
  /**
   * Generate code for a symbol, or for the whole program if no symbol is provided
   *
   * @param {Symbol} symbol (optional)
   */
  generate: function(symbol) {
    if (typeof symbol === 'undefined') {
      var declarationCode = this.generateDeclarations(this.module.syntaxTree.meta.scope)
      var statementListCode = this.generate(this.module.syntaxTree)
      var code = new Code()
      code.unit += '#include <stdlib.h>\n'
      for (var type in this.cTypes) {
        code.unit += this.cTypes[type].unit
      }
      code.unit += 'struct var_t var_from_int(int);'
      for (var cast in this.functionCasts) {
        code.unit += this.functionCasts[cast].unit
      }
      code.unit += declarationCode.unit + statementListCode.unit +
        'void module_' + this.module.uuid + '(void) {' +
          'if (!closure_' + this.module.uuid + ') {' +
            declarationCode.block + 
            statementListCode.block +
          '}'+
        '};'
      return code
    } else {
      return this[symbol.type](symbol)
    }
  },
  
  /**
   * Generate C code for the declarations in the provided scope, rewriting all 
   * variable names into valid C identifiers in the process.
   *
   * If the current scope is a closure, this method is also responsible for
   * generating all closure-related code.
   *
   * @param {Object} scope
   */
  generateDeclarations: function(scope) {
    var code = new Code()
    if (scope.closure) {
      // Generate code for a struct that will hold closure members
      var closureName = scope.closureName = 'struct ' + this.uniqueName('closure')
      code.unit += closureName + ' {'
      
      // Generate code for allocating the closure struct in the heap
      code.block += closureName + ' *closure = calloc(1, sizeof(' + closureName + '));'
      
      if (scope.parent) {
        code.unit += scope.parent.closureName + ' *parent; '
        code.block += 'closure->parent = parent;'
      }
      
      for (var name in scope.variables) {
        // Rewrite variable name to valid C identifier
        var rewrittenName = scope.variables[name].rewrittenName = this.rewriteName(name)
        
        // Add variable to closure struct
        code.unit += this.toCType(scope.variables[name].type) + ' ' + rewrittenName + ';'
        
        // If the variable is a function argument, copy its value to the closure struct
        if (!scope.variables[name].free) {
          code.block += 'closure->' + rewrittenName + ' = ' + rewrittenName + ';'
        }
      }
      code.unit += '};'
      
      if (!scope.parent) {
        code.unit += 'void *' + 'closure_' + this.module.uuid + ' = 0;'
        code.block += 'closure_' + this.module.uuid + ' = closure;'
      }
    } else {
      for (var name in scope.variables) {
        // Rewrite variable name to valid C identifier
        scope.variables[name].rewrittenName = this.rewriteName(name)
        
        // Declare free (non-parameter) variables
        if (scope.variables[name].free) {
          code.block += this.toCType(scope.variables[name].type) + ' ' + scope.variables[name].rewrittenName + ';'
        }
      }
    }
    return code
  },
  
  /**
   * Returns the inline C code needed to access a variable from a scope,
   * handling all the closure-related transformations.
   */
  accessVariableFromScope: function(variable, scope) {
    var result = ''
    if (variable.scope.closure) {
      result += 'closure->'
    }
    
    for (var i = 0; i < variable.scope.level - scope.level; i++) {
      result + 'parent->'
    }
    
    result += variable.rewrittenName
    
    return result
  },
  
  /**
   * Generate code for a typecast
   *
   * @param {String} inline
   * @param {Type} from
   * @param {Type} to
   */
  generateCast: function(inline, from, to) {
    var code = new Code()
    
    if (from.equals(to)) {
      code.inline += inline
    } else {    
      if (from.is('function')) {
        if (to.is('function')) {
          if (!this.functionCasts[[from, to]]) {
            var structName = 'struct ' + this.uniqueName('function_cast_storage')
            var name = this.uniqueName('function_cast') 
            var args = to.subtypes.slice(1).map(function(arg, i){ return this.toCType(arg) + ' arg' + i }, this)
            var unit = ''
            unit += structName + ' { ' + this.toCType(from) + ' original; };' 
            unit += this.toCType(to.returnType()) + ' ' + name + '(void *parent, ' + this.cTypes['var'].name + ' this, ' + args.join(', ') + ') {' 
            unit +=   structName + ' *storage = parent;'
            for (var i = 1; i < to.subtypes.length; i++) {
              var castCode = this.generateCast('arg'+(i-1), to.subtypes[i], from.subtypes[i])
              unit += castCode.block
              unit += this.toCType(from.subtypes[i]) + ' _arg' + (i-1) + ' = ' + castCode.inline + ';'
            }
            if (!from.returnType().is('void')) {
              unit += this.toCType(from.returnType()) + ' _result = storage->function(storage->closure, this, ' + to.subtypes.slice(1).map(function(arg, i){ return '_arg' + i }, this).join(',') + ');'
              var castCode = this.generateCast('_result', from.returnType(), to.returnType())
              unit += castCode.block
              unit += 'return ' + castCode.inline + ';'
            } else {
              unit += 'storage->original.function(storage->original.closure, this, ' + to.subtypes.slice(1).map(function(arg, i){ return '_arg' + i }, this).join(',') + ');'
            }
            unit += '};'
            this.functionCasts[[from, to]] = {
              unit: unit
            , name: name
            , structName: structName
            }
          }
          var functionCast = this.functionCasts[[from, to]]
          var tempName = this.uniqueName('temp')
          code.block += functionCast.structName + ' *' + tempName + ' = calloc(1, sizeof(' + functionCast.structName + '));'
          code.block += tempName + '->original = ' + inline + ';'
          var tempName2 = this.uniqueName('temp')
          code.block += this.toCType(to) + ' ' + tempName2 + ' = {' + tempName + ', &' + functionCast.name + '};'
          code.inline = tempName2
        } else {
          throw new Error('unimplemented')
        }
      } else if (from.is('var')) {
        if (to.is('function')) {
          throw new Error('unimplemented')
        } else {
          code.inline += 'var_to_' + from.toString() + '(' + inline + ')'
        }
      } else {
        if (to.is('var')) {
          code.inline += 'var_from_' + from.toString() + '(' + inline + ')'
        } else {
          code.inline += '(' + this.toCType(to) + ')' + inline
        }
      }
    }

    return code
  },
  
  /**
   * Symbols
   */
  
  'statement list': function(statementList) {
    var code = new Code()
    statementList.children.forEach(function(child) {
      var childCode = this.generate(child)
      code.unit += childCode.unit
      code.block += childCode.block
    }, this)
    return code
  },
  
  'declaration statement': function(declarationStatement) {
    var code = new Code()
    var declarationList = declarationStatement.children[1]
    declarationList.children.forEach(function(declaration) {
      if (declaration.is('assignment expression')) {
        var declarationCode = this.generate(declaration)
        code.unit += declarationCode.unit
        code.block += declarationCode.block
        code.block += declarationCode.inline + ';'
      }
    }, this)
    return code
  },
  
  'declaration': function(declaration) {
    var code = new Code()
    code.inline = this.accessVariableFromScope(declaration.meta.info, declaration.meta.info.scope)
    return code
  },
  
  'assignment expression': function(assignmentExpression) {
    var code = new Code()
    var leftCode = this.generate(assignmentExpression.children[0])
    var rightCode = this.generate(assignmentExpression.children[2])
    var castCode = this.generateCast(rightCode.inline, assignmentExpression.children[2].meta.type, assignmentExpression.children[0].meta.type)
    code.unit += leftCode.unit + rightCode.unit + castCode.unit
    code.block += this.lineMapping(assignmentExpression)
    code.block += leftCode.block + rightCode.block + castCode.block
    code.inline += leftCode.inline + ' = ' + castCode.inline
    return code
  },
  
  'number literal': function(numberLiteral) {
    var code = new Code()
    code.inline = numberLiteral.value
    return code
  },
  
  'function literal': function(functionLiteral) {
    var code = new Code()
    var returnType = this.toCType(functionLiteral.meta.type.returnType())
    var name = this.uniqueName('temp')
    var args
    if (functionLiteral.children.length == 2) {
      args = functionLiteral.children[0].children.map(function(arg){
        return this.cTypes['var'].name + ' ' + this.rewriteName(arg.meta.info.name)
      }, this)
    } else {
      args = ['void']
    }
    var declarationCode = this.generateDeclarations(functionLiteral.meta.scope)
    var statementListCode = this.generate(functionLiteral.children[functionLiteral.children.length - 1])
    code.unit += declarationCode.unit + statementListCode.unit
    code.unit +=
      'static ' + returnType + ' ' + name + '( void *parent, ' + this.cTypes['var'].name + ' this,' + args.join(', ') + ') {' +
         declarationCode.block +
         statementListCode.block +
      '};'
    // Temporary variable used to hold function literal
    var tmpVarName = this.uniqueName('temp')
    code.block += this.toCType(functionLiteral.meta.type) + ' ' + tmpVarName + ' = {' +
      '(void *)closure, &'+name+
    '};'
    code.inline += tmpVarName
    return code
  }
}

var generator = module.exports = function(module) {
  var generator = new Generator(module);
  var code = generator.generate()
  console.log(code.unit)
  return code.unit
}