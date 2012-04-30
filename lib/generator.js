var uuid = require('node-uuid')

var Type = require('./type')

var Code = function() {
  this.unit = ''
  this.block = ''
  this.inline = ''
}

var Generator = function(module) {
  this.cTypes = { 'var' : { name: 'struct katana_var_t'
                          , unit: 'struct katana_var_t { long long int data[2]; };'
                          }
                }
  this.module = module
}

Generator.prototype = {
  toCType: function(type) {
    switch(type.type) {
      case 'int': return (process.arch == 'x64') ? 'long long int' : 'long int'
      case 'uint': return (process.arch == 'x64') ? 'unsigned long long int' : 'unsigned long int'
      case 'float': return (process.arch == 'x64') ? 'double' : 'float'
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
      case 'pointer': return this.toCType(type.subtypes[0]) + '*'
      case 'function':
        // Check if we already have a c struct that represents this type
        if (this.cTypes[type]) {
          return this.cTypes[type].name
        } else {
          // Generate a struct that represents this type
          var name = 'struct katana_' +
            type.toString()
            .replace(/\(/g, '_$$') // mangle the name to a valid C identifier
            .replace(/\)/g, '$$_')
            .replace(/\*/g, '_pointer')
            .replace(/\,/g, '_') + 't'
          var args = []
          for (var i = 1; i < type.subtypes.length; i++) {
            args.push(this.toCType(type.subtypes[i]))
          }
          if (args.length == 0) {
            args.push('void')
          }
          var unit = name + '{ void * context; ' + this.toCType(type.subtypes[0]) + ' (*function) (' + args.join(', ') + '); };';
          // Store it and return
          this.cTypes[type] = {
            name: name
          , unit: unit
          }
          return name
        }
      case 'var':
        return this.cTypes[type].name
      default:
        switch (type.family()) {
          case 'uint': return 'unsigned long long int'
          case 'int': return 'long long int'
        }
    }
  },
  
  uniqueName: function() {
    return 'katana_temp_' + uuid.v4().replace(/\-/g, '')
  },
  
  generate: function(symbol) {
    if (typeof symbol === 'undefined') {
      var declarationCode = this.generateDeclarations(this.module.syntaxTree.meta.scope)
      var statementListCode = this.generate(this.module.syntaxTree)
      var code = new Code()
      for (var type in this.cTypes) {
        code.unit += this.cTypes[type].unit
      }
      code.unit += declarationCode.unit + statementListCode.unit +
        'void katana_module_' + this.module.uuid + '(void) {' +
          declarationCode.block + 
          statementListCode.block +
        '};';
      return code
    } else {
      return this[symbol.type](symbol)
    }
  },
  
  generateDeclarations: function(scope) {
    var code = new Code()
    for (var name in scope.variables) {
      if (scope.variables[name].free) {
        code.block += this.toCType(scope.variables[name].type) + ' ' + name + ';'
      }
    }
    return code
  },
  
  generateCast: function(symbol, type) {
    if (symbol.meta.type.equals(type)) {
      return this.generate(symbol)
    }
    
    var code = new Code()
    
    var symbolCode = this.generate(symbol)
    code.unit += symbolCode.unit
    code.block += symbolCode.block
    code.inline += '(' + this.toCType(type) + ')' + symbolCode.inline
    return code
  },
  
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
    code.inline = declaration.meta.info.name
    return code
  },
  
  'assignment expression': function(assignmentExpression) {
    var code = new Code()
    var leftCode = this.generate(assignmentExpression.children[0])
    var rightCode = this.generateCast(assignmentExpression.children[2], assignmentExpression.children[0].meta.type)
    code.unit += leftCode.unit + rightCode.unit
    code.block += leftCode.block + rightCode.block
    code.inline += leftCode.inline + ' = ' + rightCode.inline
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
    var name = this.uniqueName()
    var args
    if (functionLiteral.children.length == 2) {
      args = functionLiteral.children[0].children.map(function(arg){
        return this.cTypes['var'].name + ' ' + arg.meta.name
      }, this)
    } else {
      args = ['void']
    }
    var declarationCode = this.generateDeclarations(functionLiteral.meta.scope)
    var statementListCode = this.generate(functionLiteral.children[functionLiteral.children.length - 1])
    code.unit += declarationCode.unit + statementListCode.unit
    code.unit +=
      'static ' + returnType + ' ' + name + '(' + args.join(', ') + ') {' +
         declarationCode.block +
         statementListCode.block +
      '};'
    var tmpVarName = this.uniqueName()
    code.block += this.toCType(functionLiteral.meta.type) + ' ' + tmpVarName + ' = {' +
      '(void *)0, &'+name+
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