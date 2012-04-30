var uuid = require('node-uuid')

var Type = require('./type')

Type.prototype.toCType = function() {
  switch(this.type) {
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
    case 'pointer': return this.subtypes[0].toCType() + '*'
    case 'function': 
      var args = []
      for (var i = 1; i < this.subtypes.length; i++) {
        args.push(this.subtypes[i].toCType())
      }
      if (args.length == 0) {
        args.push('void')
      }
      return 'struct { void * context; ' + this.subtypes[0].toCType() + ' (*function) (' + args.join(', ') + '); }';
    case 'var':
      return 'struct { long long int data[2]; }'
    default:
      switch (this.family()) {
        case 'uint': return 'unsigned long long int'
        case 'int': return 'long long int'
      }
  }
}

var Code = function() {
  this.unit = ''
  this.block = ''
  this.inline = ''
}

var Generator = function(module) {
  this.module = module
}

var generateDeclarations = function(scope) {
  var code = new Code()
  for (var name in scope.variables) {
    code.block += scope.variables[name].type.toCType() + ' ' + name + ';'
  }
  return code
}

Generator.prototype = {
  uniqueName: function() {
    return '__' + this.module.uuid + '_' + uuid.v4().replace(/\-/g, '')
  },
  
  generate: function(symbol) {
    if (typeof symbol === 'undefined') {
      var declarationCode = generateDeclarations(this.module.syntaxTree.meta.scope)
      var statementListCode = this.generate(this.module.syntaxTree)
      var code = new Code()
      code.unit = declarationCode.unit + statementListCode.unit +
        'void __' + this.module.uuid + '() {' +
          declarationCode.block + 
          statementListCode.block +
        '}';
      return code
    } else {
      return this[symbol.type](symbol)
    }
  },
  
  generateCast: function(symbol, type) {
    if (symbol.meta.type.equals(type)) {
      return this.generate(symbol)
    }
    
    var code = new Code()
    
    var symbolCode = this.generate(symbol)
    code.unit += symbolCode.unit
    code.block += symbolCode.block
    code.inline += '(' + type.toCType() + ')' + symbolCode.inline
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
}

var generator = module.exports = function(module) {
  var generator = new Generator(module);
  var code = generator.generate()
  console.log(code.unit)
  return code.unit
}