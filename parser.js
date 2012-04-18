/**
 * Module Dependencies
 */
var lexer = require('./lexer')
var Symbol = lexer.Symbol
var keywords = lexer.keywords
var KatanaError = require('./misc').KatanaError

var isTypeName = function(value) {
  return lexer.typeKeywords.indexOf(value.slice(1)) != -1
}

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

var Parser = function(rewriterOutput) {
  this.scopeStack = [{}]
  this.tokens = rewriterOutput.tokens
  this.position = 0
  this.errors = rewriterOutput.errors
}

Parser.prototype = {
  scope: function() {
    return this.scopeStack[this.scopeStack.length - 1]
  }
, error: function(msg) {
    var next = this.next()
    var error = new KatanaError('syntax', 'error', msg, next.line, next.column, next.column + next.value.length)
    this.errors.push(error)
    throw error
  }
, next: function(offset, autoKeywords) {
    if (typeof offset === 'undefined') {
      offset = 0
    }
    if (typeof autoKeywords === 'undefined') {
      autoKeywords = true
    }
    var token = this.tokens[this.position + offset]
    // Automatically convert identifiers to keywords
    if (autoKeywords && (typeof token !== 'undefined') && token.type === 'identifier') {
      if (keywords.indexOf(token.value) != -1 && typeof (this.scope()[token.value]) === 'undefined') {
        token.type = 'keyword'
        token.value = '\\' + token.value
      }
    }
    return token
  }
, expect: function(type, value, skip, autoKeywords) {
    var next, originalPosition
    if (typeof skip === 'undefined') {
      skip = 'newline'
    }
    if (skip) {
      originalPosition = this.position
      while ((next = this.next(undefined, autoKeywords)).is(skip)) {
        this.position++
      }
      this.position = originalPosition
    } else {
      next = this.next(undefined, autoKeywords)
    }
    if (next.is(type, value)) {
      return next
    } else {
      return null
    }
  }
, eat: function(type, value, skip, autoKeywords) {
    var next, originalPosition
    if (typeof skip === 'undefined') {
      skip = 'newline'
    }
    if (skip) {
      originalPosition = this.position
      while (next = this.next(undefined, autoKeywords), next.is(skip) && !next.is(type, value) && !next.is('end of file')) {
        this.position++
      }
    } else {
      next = this.next(undefined, autoKeywords)
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
      if (!this.expect('curly bracket', '}')) {
        this.error('Expected `;`.')
      }
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
  var statementList 
  try {
    statementList = this.StatementList()
  } catch (err) { 
    if (err.name !== 'KatanaError') { throw err }
  }
  return statementList
}
, Block: function() {
    if (!this.eat('curly bracket', '{')) {
      this.error('Expected block of code.')
    }
    var statementList = this.StatementList()
    if (!this.eat('curly bracket', '}')) {
      this.error('Expected end of block.')
    }
    return statementList
  }
, StatementList: function() {
    var statements = []
    while (!(this.expect('curly bracket', '}') || 
            this.expect('end of file'))) {
      try {
        statements.push(this.Statement())
      } catch (err) { 
        if (err.name !== 'KatanaError') { throw err }
        this.eat('newline', undefined, '*') // skip until newline
      }
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
      } else if (keyword.value == '\\return') {
        return this.ReturnStatement()
      } else if (keyword.value == '\\break') {
        return this.BreakStatement()
      } else if (keyword.value == '\\continue') {
        return this.ContinueStatement()
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
, ReturnStatement: function() {
    this.eat('keyword', '\\return')
    if (this.expect('semicolon') || this.expect('curly bracket', '}') || this.expect('end of file')) {
      this.automaticSemicolon()
      return new Symbol('return statement', null)
    } else {
      var value = this.Expression()
      this.automaticSemicolon()
      return new Symbol('return statement', null, [value])
    }
  }
, BreakStatement: function() {
    this.eat('keyword', '\\break')
    this.automaticSemicolon()
    return new Symbol('break statement', null)
  }
, ContinueStatement: function() {
    this.eat('keyword', '\\continue')
    this.automaticSemicolon()
    return new Symbol('continue statement', null)
  }
, Expression: function() {
    var assignmentExps = [this.AssignmentExpression()]
    for (;;) {
      if (this.eat('comma')) {
        assignmentExps.push(this.AssignmentExpression())
      } else {
        if (assignmentExps.length == 1 && assignmentExps[0].is('expression')) {
          return assignmentExps[0]
        } else {
          return new Symbol('expression', null, assignmentExps)
        }
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
, MultiplicationExpression: leftAssociativeOperator('ApplyExpression', 'multiplication operator', 'multiplication expression')
, ApplyExpression: leftAssociativeOperator('InheritanceExpression', 'bang', 'apply expression')
, InheritanceExpression: leftAssociativeOperator('UnaryExpression', 'colon', 'inheritance expression')
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
      var memberOrCallExpression = this.MemberOrCallExpression()
      return new Symbol('increment expression', null, [operator, memberOrCallExpression])
    } else {
      var memberOrCallExpression = this.MemberOrCallExpression()
      if (operator = this.eat('increment operator')) {
        return new Symbol('increment expression', null, [memberOrCallExpression, operator])
      } else {
        return memberOrCallExpression
      }
    }
  }
, MemberOrCallExpression: function(term) {
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
      } else if (this.eat('square bracket', '[', false)) {
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
      } else if (this.eat('paren', '(', false)) {
        if (this.eat('paren', ')')) {
          term = new Symbol('call expression', null, [term])
        } else {
          var expression = this.Expression()
          if (!this.eat('paren', ')')) {
            this.error('Expected `)` at the end of function call')
          }
          term = new Symbol('call expression', null, [term, expression])
        }
      } else {
        return term
      }
    }
  }
, Term: function() {
    var value = this.eat(['string literal', 'number literal', 'identifier'])
    if (!value) {
      if (this.eat('paren', '(')) {
        if (this.expect('keyword', isTypeName)) {
          var type = this.Type()
          if (!this.eat('paren', ')')) {
            this.error('Expected `)` closing typecast.')
          }
          var memberOrCallExpression = this.MemberOrCallExpression()
          value = new Symbol('typecast', null, [type, memberOrCallExpression])
        } else {
          value = this.Expression()
          if (!this.eat('paren', ')')) {
            this.error('Expected closing paren `)`')
          }
        }
      } else if (this.expect('square bracket', '[')) {
        value = this.ArrayLiteral()
      } else if (this.expect('curly bracket', '{')) {
        value = this.ObjectLiteral()
      } else if (this.expect('keyword', /^(\\take|\\do)$/)) {
        value = this.FunctionLiteral()
      } else {
        this.error('Expected a value')
      }
    }
    return value
  }
, Type: function() {
    var type = [this.eat('keyword')]
    if (type[0].value == '\\struct') {
      var name
      if (name = this.eat('identifier')) {
        type.push(name)
      } else {
        this.error('Expected a struct name')
      }
    }
    var pointer
    while (pointer = this.eat('multiplication operator', '*')) {
      type.push(pointer)
    }
    return new Symbol('type', null, type)
  }
, ArrayLiteral: function() {
    this.eat('square bracket', '[')
    if (this.eat('square bracket', ']')) {
      return new Symbol('array literal', null, [])
    } else {
      var contents = []
      for (;;) {
        try {
          contents.push(this.AssignmentExpression())
          if (this.eat('square bracket', ']')) {
            return new Symbol('array literal', null, contents)
          } else {
            this.automaticComma()
          }
        } catch (err) {
          if (err.name !== 'KatanaError') { throw err }
          var eaten = this.eat(['newline', 'comma', 'square bracket'], undefined, '*') // skip until newline or comma
          if (eaten && eaten.type === 'square bracket') {
            if (eaten.value == ']') {
              return new Symbol('array literal', null, contents)
            } else {
              this.eat(['newline', 'comma'])
            }
          } else {
            if (this.expect('end of file')) {
              return new Symbol('array literal', null, contents)
            }
          }
        }
      }
    }
  }
, ObjectLiteral: function() {
    var openingBracket = this.expect('curly bracket', '{')
    if (openingBracket.meta.generatedByOffside) {
      this.error('Expected value.')
    }
    this.eat('curly bracket', '{')
    if (this.eat('curly bracket', '}')) {
      return new Symbol('object literal', null, [])
    } else {
      var contents = []
      var key, value
      for (;;) {
        try {
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
        } catch (err) {
          if (err.name !== 'KatanaError') { throw err }
          var eaten = this.eat(['newline', 'comma', 'curly bracket'], undefined, '*') // skip until newline or comma
          if (eaten && eaten.type === 'curly bracket') {
            if (eaten.value == '}') {
              return new Symbol('object literal', null, contents)
            } else {
              this.eat(['newline', 'comma'])
            }
          } else {
            if (this.expect('end of file')) {
              return new Symbol('object literal', null, contents)
            }
          }
        }
        
      }
    }
  }
, FunctionLiteral: function() {
    if (this.eat('keyword', '\\take')) {
      return new Symbol('function literal', null, [this.Expression(), this.Block()])
    } else if (this.eat('keyword', '\\do')) {
      return new Symbol('function literal', null, [this.Block()])
    }
  }
}

var parser = function(rewriterOutput) {
  var parser = new Parser(rewriterOutput)
  return { program: parser.Program(), errors: parser.errors }
}

exports = module.exports = parser