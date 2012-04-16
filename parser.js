/**
 * Module Dependencies
 */
var lexer = require('./lexer')
var Symbol = lexer.Symbol
var keywords = lexer.keywords

var rightAssociativeOperator = function(subExpressionName, optype, type) {
  var Expression = function() {
    var operator, subExpression = this[subExpressionName]()
    if (!(operator = this.eat(optype))) {
      return subExpression;
    }
    var expression = Expression.apply(this)
    return new Symbol(type, null, [subExpression, operator, expression])
  }
  return Expression
}

var leftAssociativeOperator = function(subExpressionName, optype, type) {
  return function() {
    var operator, subExpression = this[subExpressionName]()
    while (operator = this.eat(optype)) {
      subExpression = new Symbol(type, null, [subExpression, operator, this[subExpressionName]()])
    }
    return subExpression
  }
}

var ParseError = function(message, line, startColumn, endColumn) {
  this.name = "ParseError"
  this.message = message
  this.line = line
  this.startColumn = startColumn
  this.endColumn = endColumn
}

ParseError.prototype = new Error()
ParseError.prototype.constructor = ParseError

var Parser = function(tokens) {
  this.scopeStack = [{}]
  this.tokens = tokens
  this.position = 0
}

Parser.prototype = {
  scope: function() {
    return this.scopeStack[this.scopeStack.length - 1]
  }
, error: function(msg) {
    var next = this.next()
    var nextNext = this.next(+1) || { column: next.column }
    throw new ParseError(msg, next.line, next.column, nextNext.column)
  }  
, next: function(offset) {
    if (typeof offset === 'undefined') {
      offset = 0
    }
    var token = this.tokens[this.position + offset]
    // Automatically convert identifiers to keywords
    if ((typeof token !== 'undefined') && token.type === 'identifier') {
      if (keywords.indexOf(token.value) != -1 && typeof (this.scope()[token.value]) === 'undefined') {
        token.type = 'keyword'
        token.value = '\\' + token.value
      }
    }
    return token
  }
, expect: function(type, value, skip) {
    var next, originalPosition
    if (typeof skip === 'undefined') {
      skip = 'newline'
    }
    if (skip) {
      originalPosition = this.position
      while ((next = this.next()).is(skip)) {
        this.position++
      }
      this.position = originalPosition
    } else {
      next = this.next()
    }
    if (next.is(type, value)) {
      return next
    } else {
      return null
    }
  }
, eat: function(type, value, skip) {
    var next, originalPosition
    if (typeof skip === 'undefined') {
      skip = 'newline'
    }
    if (skip) {
      originalPosition = this.position
      while ((next = this.next()).is(skip)) {
        this.position++
      }
    } else {
      next = this.next()
    }
    if (next.is(type, value)) {
      this.position++
      return next
    } else {
      if (skip) {
        this.position = originalPosition
      }
      return null
    }
  }
, automaticSemicolon: function() {
  if (!this.eat('semicolon')) {
    if (!this.eat('newline', undefined, false)) {
      this.error('Expected `;`.')
    }
  }
}
, automaticComma: function() {
  if (!this.eat('comma')) {
    if (!this.eat('newline', undefined, false)) {
      this.error('Expected `,`.')
    }
  }
}
, Program: function() {
  var statementList = this.StatementList()
  if (!this.eat('end of file')) {
    this.error('Expected end of file.')
  }
  return statementList
}
, Block: function() {
    if (!this.eat('curly bracket', '{')) {
      this.error('Expected `{` at beginning of block.')
    }
    var statementList = this.StatementList()
    if (!this.eat('curly bracket', '}')) {
      this.error('Expected `}` at end of block.')
    }
    return statementList
  }
, StatementList: function() {
    var statements = []
    while (!(this.expect('curly bracket', '}') || 
            this.expect('end of file'))) {
      statements.push(this.Statement())
    }
    return new Symbol('statement list', null, statements)
  }
, Statement: function() {
    var semicolon, keyword
    if (semicolon = this.eat('semicolon')) {
      return new Symbol('empty statement', null, [], semicolon.line, semicolon.column)
    } else if (keyword = this.expect('keyword')) {
      if (keyword.value == '\\if') {
        return this.IfStatement()
      } else if (keyword.value == '\\while') {
        return this.WhileStatement()
      } else if (keyword.value == '\\for') {
        return this.ForStatement()
      }
    }
    var expression = this.Expression()
    this.automaticSemicolon()
    return expression
  }
, IfStatement: function() {
    this.eat('keyword', '\\if')
    var condition = this.Expression()
    var action = this.Block()
    var negativeAction
    if (this.eat('keyword', '\\else')) {
      if (this.expect('keyword', '\\if')) {
        // Allow chained else ifs
        negativeAction = this.IfStatement()
      } else {
        negativeAction = this.Block()
        this.automaticSemicolon()
      }
      return new Symbol('if statement', null, [condition, action, negativeAction])
    } else {
      this.automaticSemicolon()
      return new Symbol('if statement', null, [condition, action])      
    }
  }
, WhileStatement: function() {
    this.eat('keyword', '\\while')
    var condition = this.Expression()
    var block = this.Block()
    this.automaticSemicolon()
    return new Symbol('while statement', null, [condition, block])
  }
, ForStatement: function() {
    this.eat('keyword', '\\for')
    var condition = this.Expression()
    var block = this.Block()
    this.automaticSemicolon()
    return new Symbol('for statement', null, [condition, block])
  }
, Expression: function() {
    var assignmentExps = [this.AssignmentExpression()]
    for (;;) {
      if (this.eat('comma')) {
        assignmentExps.push(this.AssignmentExpression())
      } else {
        return new Symbol('expression', null, assignmentExps)
      }
    }
  }
, AssignmentExpression: rightAssociativeOperator('LogicalOrExpression', 'assignment operator', 'assignment expression')
, LogicalOrExpression: leftAssociativeOperator('LogicalXorExpression', 'logical or operator', 'logical expression')
, LogicalXorExpression: leftAssociativeOperator('LogicalAndExpression', 'logical xor operator', 'logical expression')
, LogicalAndExpression: leftAssociativeOperator('BitwiseOrExpression', 'logical and operator', 'logical expression')
, BitwiseOrExpression: leftAssociativeOperator('BitwiseXorExpression', 'bitwise or operator', 'bitwise expression')
, BitwiseXorExpression: leftAssociativeOperator('BitwiseAndExpression', 'bitwise xor operator', 'bitwise expression')
, BitwiseAndExpression: leftAssociativeOperator('EqualityExpression', 'bitwise and operator', 'bitwise expression')
, EqualityExpression: leftAssociativeOperator('RelationalExpression', 'equality operator', 'equality expression')
, RelationalExpression: leftAssociativeOperator('BitshiftExpression', 'relational operator', 'relational expression')
, BitshiftExpression: leftAssociativeOperator('AdditionExpression', 'bitshift operator', 'bitshift expression')
, AdditionExpression: leftAssociativeOperator('MultiplicationExpression', 'addition operator', 'addition expression')
, MultiplicationExpression: leftAssociativeOperator('UnaryExpression', 'multiplication operator', 'multiplication expression')
, UnaryExpression: function() {
    var operator
    if (operator = this.eat(['bang', 'tilde', 'addition operator'])) {
      var incrementExpression = this.IncrementExpression()
      return new Symbol('unary expression', null, [operator, incrementExpression])
    } else {
      return this.IncrementExpression()
    }
  }
, IncrementExpression: function() {
    var operator
    if (operator = this.eat('increment operator')) {
      var callExpression = this.CallExpression()
      return new Symbol('increment expression', null, [operator, callExpression])
    } else {
      var callExpression = this.CallExpression()
      if (operator = this.eat('increment operator')) {
        return new Symbol('increment expression', null, [callExpression, operator])
      } else {
        return callExpression
      }
    }
  }
, CallExpression: function() {
    var memberExpression = this.MemberExpression()
    if (this.eat('paren', '(')) {
      if (this.eat('paren', ')')) {
        var result = new Symbol('call expression', null, [memberExpression])
      } else {
        var expression = this.Expression()
        if (!this.eat('paren', ')')) {
          this.error('Expected `)` at the end of function call')
        }
        var result = new Symbol('call expression', null, [memberExpression, expression])
      }
      if (this.expect('dot') || this.expect('square bracket', '[')) {
        return this.MemberExpression(result)
      }
      return result
    } else {
      return memberExpression
    }
  }
, MemberExpression: function(term) {
    var identifier
    if (typeof term === 'undefined') {
      term = this.Term()
    }
    for (;;) {
      if (this.eat('dot')) {
        if (!(identifier = this.eat('identifier'))) {
          this.error('Expected identifier after `.`')
        }
        term = new Symbol('literal member expression', null, [term, identifier])
      } else if (this.eat('square bracket', '[')) {
        var expression = this.Expression()
        if (!this.eat('square bracket', ']')) {
          this.error('Expected `]` at the end of property access')
        }
        term = new Symbol('member expression', null, [term, expression])
      } else if (this.eat('prototype operator')) {
        if (!(identifier = this.eat('identifier'))) {
          this.error('Expected identifier after `::`')
        }        
        term = new Symbol('literal prototype expression', null, [term, identifier])
      } else {
        return term
      }
    }
  }
, Term: function() {
    var value = this.eat(['string literal', 'number literal', 'identifier'])
    if (!value) {
      if (this.eat('paren', '(')) {
        value = this.Expression()
        if (!this.eat('paren', ')')) {
          this.error('Expected closing paren `)`')
        }
      } else if (this.expect('square bracket', '[')) {
        value = this.ArrayLiteral()
      } else if (this.expect('curly bracket', '{')) {
        value = this.ObjectLiteral()
      }else {
        this.error('Expected literal or identifier inside expression')
      }
    }
    return value
  }
, ArrayLiteral: function() {
    this.eat('square bracket', '[')
    if (this.eat('square bracket', ']')) {
      return new Symbol('array literal', null, [])
    } else {
      var contents = []
      for (;;) {
        contents.push(this.AssignmentExpression())
        if (this.eat('square bracket', ']')) {
          return new Symbol('array literal', null, contents)
        } else {
          this.automaticComma()
        }
      }
    }
  }
, ObjectLiteral: function() {
    this.eat('curly bracket', '{')
    if (this.eat('curly bracket', '}')) {
      return new Symbol('object literal', null, [])
    } else {
      var contents = []
      var key, value
      for (;;) {
        if (!(key = this.eat(['identifier', 'number literal', 'string literal']))) {
          this.error('Expected key inside object literal.')
        } 
        if (this.eat('colon')) {
          value = this.AssignmentExpression()
        } else {
          value = key
        }
        contents.push(key, value)
        if (this.eat('curly bracket', '}')) {
          return new Symbol('object literal', null, contents)
        } else {
          this.automaticComma()
        }
      }
    }
  }
}

var parser = function(tokens) {
  var parser = new Parser(tokens)
  return parser.Program()
}

exports = module.exports = parser