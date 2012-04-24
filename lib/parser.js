/**
 * Module Dependencies
 */
var lexer = require('./lexer')
var Symbol = require('./symbol')
var keywords = lexer.keywords
var misc = require('./misc')
var KatanaError = misc.KatanaError

var isTypeName = function(value) {
  return lexer.typeKeywords.indexOf(value.slice(1)) != -1
}

/**
 * Returns a function that parses left associative operators.
 * @param {String} subExpressionName The name of the next grammar non-terminal symbol
 * @param {String} optype Operator symbol type
 * @param {String} optype Symbol type after reduction
 */

var rightAssociativeOperator = function(subExpressionName, optype, type) {
  var Expression = function() {
    var operator, subExpression = this[subExpressionName]()
    if (!(operator = this.eat(optype))) {
      return subExpression;
    }
    var expression = Expression.apply(this)
    return new Symbol(type, { children: [subExpression, operator, expression] })
  }
  return Expression
}

/**
 * Returns a function that parses right associative operators.
 * @param {String} subExpressionName The name of the next grammar non-terminal symbol
 * @param {String} optype Operator symbol type
 * @param {String} optype Symbol type after reduction
 */

var leftAssociativeOperator = function(subExpressionName, optype, type) {
  return function() {
    var operator, subExpression = this[subExpressionName]()
    while (operator = this.eat(optype)) {
      subExpression = new Symbol(type, { children: [subExpression, operator, this[subExpressionName]()] })
    }
    return subExpression
  }
}

/**
 * Creates a parser
 * @param {Object} rewriterOutput
 */

var Parser = function(rewriterOutput) {
  this.scopeStack = [{}]
  this.tokens = rewriterOutput.tokens
  this.position = 0
  this.errors = rewriterOutput.errors
}

Parser.prototype = {
  
  scope: function() {
    return this.scopeStack[this.scopeStack.length - 1]
  },
  
  /**
   * Report an error 
   * @param {String} msg The error message
   */
     
  error: function(msg) {
    var next = this.next()
    var error = new KatanaError('syntax', 'error', msg, next.line, next.column, next.column + next.value.length)
    this.errors.push(error)
    throw error
  },
  
  /**
   * Return the next token, or a token relative to the next token.
   *
   * @param {Number} offset        The offset in relation to the next token.
   * @param {Boolean} autoKeywords  Whether to automatically convert identifiers in keywords
   */
  
  next: function(offset, autoKeywords) {
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
  },
  
  /**
   * Test if the next token is of the specified type and value, optionally
   * skipping tokens and converting identifiers to keywords
   * @param {String}                       type  
   * @param {String,Array,Regexp,Function} value
   * @param {Boolean} skip
   * @param {Boolean} autoKeywords
   */
  
  expect: function(type, value, skip, autoKeywords) {
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
  },
  
  /**
   * Eat the next token if it is of the specified type and value, optionally
   * skipping tokens and converting identifiers to keywords
   */  
  
  eat: function(type, value, skip, autoKeywords) {
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
  },
  
  /**
   * Performs automatic semicolon insertion (ASI)
   * @param {String} context  Used for error reporting.
   */
  
  automaticSemicolon: function(context) {
    if (!this.eat('semicolon')) {
      if (!this.eat('newline', undefined, false)) {
        if (!this.expect('curly bracket', '}')) {
          this.error('Expected `;` after ' + context + '.')
        }
      }
    }
  },
  
  /**
   * Performs automatic comma insertion
   */

  automaticComma: function() {
    if (!this.eat('comma')) {
      if (!this.eat('newline', undefined, false)) {
        this.error('Expected `,`.')
      }
    }
  },

  /**
   * Program ::= StatementList
   */
  
  Program: function() {
    var statementList 
    try {
      statementList = this.StatementList()
    } catch (err) { 
      if (err.name !== 'KatanaError') { throw err }
    }
    return statementList
  },

  /**
   * Block ::= "{" StatementList "}"
   */

  Block: function() {
    if (!this.eat('curly bracket', '{')) {
      this.error('Expected block of code.')
    }
    var statementList = this.StatementList()
    if (!this.eat('curly bracket', '}')) {
      this.error('Expected end of block.')
    }
    return statementList
  },
  
  /**
   * StatementList ::= StatementList Statement
   *                 | ""
   */
  
  StatementList: function() {
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
    return new Symbol('statement list', { children: statements })
  },
  
  /**
   * Statement ::= IfStatement
   *             | WhileStatement   
   *             | ForStatement
   *             | ReturnStatement
   *             | BreakStatement
   *             | ContinueStatement
   *             | ImportStatement
   *             | ExportStatement
   *             | DeclarationStatement
   *             | Expression ";"
   *             | ";"
   */
  
  Statement: function() {
    var semicolon, keyword
    if (semicolon = this.eat('semicolon')) {
      return new Symbol('empty statement', { line: semicolon.line, column: semicolon.column })
    } else if (keyword = this.expect('keyword')) {
      switch (keyword.value) {
      case '\\if': return this.IfStatement()
      case '\\while': return this.WhileStatement()
      case '\\for': return this.ForStatement()
      case '\\return': return this.ReturnStatement()
      case '\\break': return this.BreakStatement()
      case '\\continue': return this.ContinueStatement()
      case '\\import': return this.ImportStatement()
      case '\\export': return this.ExportStatement()
      default: 
        if (isTypeName(keyword.value)) {
          return this.DeclarationStatement()
        }
      }
    }
    var expression = this.Expression()
    this.automaticSemicolon('expression')
    return expression
  },
  
  /**
   * IfStatement ::= "if" Expression Block ";"
   *               | "if" Expression "else" Block ";"
   *               | "if" Expression "else" IfStatement
   */
  
  IfStatement: function() {
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
        this.automaticSemicolon('else statement')
      }
      return new Symbol('if statement', { children: [condition, action, negativeAction] })
    } else {
      this.automaticSemicolon('if statement')
      return new Symbol('if statement', { children: [condition, action] })
    }
  },
  
  /**
   * WhileStatement ::= "while" Expression Block ";"
   */

  WhileStatement: function() {
    this.eat('keyword', '\\while')
    var condition = this.Expression()
    var block = this.Block()
    this.automaticSemicolon('while statement')
    return new Symbol('while statement', { children: [condition, block] })
  },

  /**
   * ForStatement ::= "for" <identifier> "in" Expression Block ";"
   *                | "for" <identifier> ":" <identifier> "in" Expression Block ";" 
   */

  ForStatement: function() {
    var children = []
    this.eat('keyword', '\\for')
    var identifier = this.eat('identifier', undefined, undefined, false)
    if (identifier) {
      children.push(identifier)
    } else {
      this.error('Expected identifier.')
    }
    if (this.eat('colon')) {
      identifier = this.eat('identifier', undefined, undefined, false)
      if (identifier) {
        children.push(identifier)
      } else {
        this.error('Expected identifier.')
      }
    }    
    this.eat('keyword', '\\in')
    children.push(this.Expression())
    children.push(this.Block())
    this.automaticSemicolon('for statement')
    return new Symbol('for statement', { children: children })
  },
  
  /**
   * ReturnStatement ::= "return" Expression ";"
   *                   | "return" ";"
   */

  ReturnStatement: function() {
    var returnToken = this.eat('keyword', '\\return')
    if (this.expect('semicolon') || this.expect('curly bracket', '}') || this.expect('end of file')) {
      this.automaticSemicolon('return statement')
      return new Symbol('return statement', { line: returnToken.line, column: returnToken.column })
    } else {
      var expression = this.Expression()
      this.automaticSemicolon('return statement')
      return new Symbol('return statement', { children: [expression] })
    }
  },

  /**
   * BreakStatement ::= "break" ";"
   */

  BreakStatement: function() {
    var breakKeyword = this.eat('keyword', '\\break')
    this.automaticSemicolon('break statement')
    return new Symbol('break statement', { line: breakKeyword.line, column: breakKeyword.column })
  },

  /**
   * ContinueStatement ::= "continue" ";"
   */

  ContinueStatement: function() {
    var continueKeyword = this.eat('keyword', '\\continue')
    this.automaticSemicolon('continue statement')
    return new Symbol('continue statement', { line: continueKeyword.line, column: continueKeyword.column })
  },
  
  /**
   * ImportStatement ::= "import" ImportList "from" ImportPath ";"
   *                   | "import" ImportPathList ";"
   * 
   * ImportList ::= ImportList "," <identifier>
   *              | <identifier>
   *
   * ImportPathList ::= ImportPathList "," ImportPath
   *                  | ImportPath
   */
  
  ImportStatement: function() {
    this.eat('keyword', '\\import')
    var acceptFrom = true
    var importPaths = []
    for (;;) {
      var importPath = this.ImportPath()
      if (importPath.length > 1 || importPath.children[0].type != 'identifier') {
        acceptFrom = false
      }
      importPaths.push(importPath)
      if (!this.eat('comma')) {
        break
      }
    }
    if (this.expect('keyword', '\\from')) {
      if (!acceptFrom) {
        this.error('Invalid use of `from`. One or more import paths already supplyied.')
      }
      this.eat('keyword', '\\from')
      importPaths.push(this.ImportPath())
      return new Symbol('import from statement', { children: importPaths })
    }
    this.automaticSemicolon('import statement')
    return new Symbol('import statement', { children: importPaths })
  },
  
  /**
   * ImportPath ::= ImportPathComponent "/" ImportPath
   *              | ImportPathComponent
   *
   * ImportPathComponent ::= <identifier> | "." | ".."
   */
  
  ImportPath: function() {
    var path = []
    var token
    for (;;) {
      if (token = this.eat('identifier', undefined, undefined, false)) {
        path.push(token)
      } else if (token = this.eat('dot')) {
        path.push(token)
        if (token = this.eat('dot')) {
          path.push(token)
        }
      } else {
        this.error('Unexpected token in import path.')
      }
      if (token = this.eat('multiplication operator', '/')) {
        path.push(token)
      } else {
        break
      }
    }
    return new Symbol('import path', { children: path })
  },

  /**
   * ExportStatement ::= "export" DeclarationStatement
   */

  ExportStatement: function() {
    this.eat('keyword', '\\export')
    return new Symbol('export statement', { children: [this.DeclarationStatement()] })
  },

  /**
   * DeclarationStatement ::= Type DeclarationList ";"
   */

  DeclarationStatement: function() {
    var type = this.Type()
    var declarationList = this.DeclarationList()
    this.automaticSemicolon('variable declaration')
    return new Symbol('declaration statement', { children: [type, declarationList] })
  },
  
  /**
   * DeclarationList ::= Declaration "," DeclarationList
   *                   | Declaration
   */
   
  DeclarationList: function() {
    var declarations = []
    for (;;) {
      declarations.push(this.Declaration())
      if (!this.eat('comma')) {
        break
      }
    }
    return new Symbol('declaration list', { children: declarations })
  },
  
  /**
   * Declaration ::= Identifier
   *               | Identifier "=" AssignmentExpression
   */
  
  Declaration: function() {
    var identifier = this.eat('identifier', undefined, undefined, false)
    if (this.eat('assignment operator', '=')) {
      var expr = this.AssignmentExpression()
      return new Symbol('declaration', { children: [identifier, expr] })
    } else {
      return new Symbol('declaration', { children: [identifier] })
    }
  },
  
  /**
   * Expression ::= AssignmentExpression "," Expression
   *              | AssignmentExpression
   */

  Expression: function() {
    var assignmentExps = [this.AssignmentExpression()]
    for (;;) {
      if (this.eat('comma')) {
        assignmentExps.push(this.AssignmentExpression())
      } else {
        if (assignmentExps.length == 1 && assignmentExps[0].is('expression')) {
          return assignmentExps[0]
        } else {
          return new Symbol('expression', { children: assignmentExps })
        }
      }
    }
  },
  
  /**
   * Operators - Topmost has lowest precedence, bottommost has highest precedence
   */

   // AssignmentExpression ::= LogicalOrExpression <assignment operator> AssignmentExpression | LogicalOrExpression
  AssignmentExpression: rightAssociativeOperator('LogicalOrExpression', 'assignment operator', 'assignment expression'),

  // LogicalOrExpression ::= LogicalOrExpression <logical or operator> LogicalXorExpression | LogicalXorExpression
  LogicalOrExpression: leftAssociativeOperator('LogicalXorExpression', 'logical or operator', 'logical expression'),

  // LogicalXorExpression ::= LogicalXorExpression <logical xor operator> LogicalAndExpression | LogicalAndExpression
  LogicalXorExpression: leftAssociativeOperator('LogicalAndExpression', 'logical xor operator', 'logical expression'),

  // LogicalAndExpression ::= LogicalAndExpression <logical and operator> BitwiseOrExpression | BitwiseOrExpression
  LogicalAndExpression: leftAssociativeOperator('BitwiseOrExpression', 'logical and operator', 'logical expression'),

  // BitwiseOrExpression ::= BitwiseOrExpression <bitwise or operator> BitwiseXorExpression | BitwiseXorExpression
  BitwiseOrExpression: leftAssociativeOperator('BitwiseXorExpression', 'bitwise or operator', 'bitwise expression'),

  // BitwiseXorExpression ::= BitwiseXorExpression <bitwise xor operator> BitwiseAndExpression | BitwiseAndExpression
  BitwiseXorExpression: leftAssociativeOperator('BitwiseAndExpression', 'bitwise xor operator', 'bitwise expression'),

  // BitwiseAndExpression ::= BitwiseAndExpression <bitwise and operator> EqualityExpression | EqualityExpression
  BitwiseAndExpression: leftAssociativeOperator('EqualityExpression', 'bitwise and operator', 'bitwise expression'),

  // EqualityExpression ::= EqualityExpression <equality operator> RelationalExpression | RelationalExpression
  EqualityExpression: leftAssociativeOperator('RelationalExpression', 'equality operator', 'equality expression'),

  // RelationalExpression ::= RelationalExpression <relational operator> BitshiftExpression | BitshiftExpression
  RelationalExpression: leftAssociativeOperator('BitshiftExpression', 'relational operator', 'relational expression'),

  // BitshiftExpression ::= BitshiftExpression <bitshift operator> AdditionExpression | AdditionExpression
  BitshiftExpression: leftAssociativeOperator('AdditionExpression', 'bitshift operator', 'bitshift expression'),

  // AdditionExpression ::= AdditionExpression <addition operator> MultiplicationExpression | MultiplicationExpression
  AdditionExpression: leftAssociativeOperator('MultiplicationExpression', 'addition operator', 'addition expression'),

  // MultiplicationExpression ::= MultiplicationExpression <multiplication operator> ApplyExpression | ApplyExpression
  MultiplicationExpression: leftAssociativeOperator('ApplyExpression', 'multiplication operator', 'multiplication expression'),

  // ApplyExpression ::= ApplyExpression <bang> InheritanceExpression | InheritanceExpression
  ApplyExpression: leftAssociativeOperator('InheritanceExpression', 'bang', 'apply expression'),

  // InheritanceExpression ::= InheritanceExpression <colon> UnaryExpression | UnaryExpression
  InheritanceExpression: leftAssociativeOperator('UnaryExpression', 'colon', 'inheritance expression'),

  /**
   * UnaryExpression ::= <bang> IncrementExpression
   *                   | <tilde> IncrementExpression
   *                   | <addition operator> IncrementExpression
   *                   | IncrementExpression
   */
   
  UnaryExpression: function() {
    var operator
    if (operator = this.eat(['bang', 'tilde', 'addition operator'])) {
      var incrementExpression = this.IncrementExpression()
      return new Symbol('unary expression', { children: [operator, incrementExpression] })
    } else {
      return this.IncrementExpression()
    }
  },
  
  /**
   * IncrementExpression ::= <increment operator> MemberOrCallExpression
   *                       | MemberOrCallExpression <increment operator>
   *                       | MemberOrCallExpression
   */
   
  IncrementExpression: function() {
    var operator
    if (operator = this.eat('increment operator')) {
      var memberOrCallExpression = this.MemberOrCallExpression()
      return new Symbol('increment expression', { children: [operator, memberOrCallExpression] })
    } else {
      var memberOrCallExpression = this.MemberOrCallExpression()
      if (operator = this.eat('increment operator')) {
        return new Symbol('increment expression', { children: [memberOrCallExpression, operator] })
      } else {
        return memberOrCallExpression
      }
    }
  },
  
  /**
   * MemberOrCallExpression ::= MemberOrCallExpression "." <identifier>
   *                          | MemberOrCallExpression "[" <identifier> "]"
   *                          | MemberOrCallExpression "(" Expression ")"
   *                          | MemberOrCallExpression "::" <identifier>
   *                          | Term
   */
   
  MemberOrCallExpression: function(term) {
    var identifier
    if (typeof term === 'undefined') {
      term = this.Term()
    }
    for (;;) {
      if (this.eat('dot')) {
        if (!(identifier = this.eat('identifier'))) {
          this.error('Expected identifier after `.`')
        }
        term = new Symbol('literal member expression', { children: [term, identifier] })
      } else if (this.eat('square bracket', '[', false)) {
        var expression = this.Expression()
        if (!this.eat('square bracket', ']')) {
          this.error('Expected `]` at the end of property access')
        }
        term = new Symbol('member expression', { children: [term, expression] })
      } else if (this.eat('prototype operator')) {
        if (!(identifier = this.eat('identifier'))) {
          this.error('Expected identifier after `::`')
        }        
        term = new Symbol('literal prototype expression', { children: [term, identifier] })
      } else if (this.eat('paren', '(', false)) {
        if (this.eat('paren', ')')) {
          term = new Symbol('call expression', { children: [term] })
        } else {
          var expression = this.Expression()
          if (!this.eat('paren', ')')) {
            this.error('Expected `)` at the end of function call')
          }
          term = new Symbol('call expression', { children: [term, expression] })
        }
      } else {
        return term
      }
    }
  },
  
  /**
   * Term ::= "(" Expression ")"
   *        | "(" Type ")" MemberOrCallExpression
   *        | <string literal>
   *        | <number literal>
   *        | <identifier>
   *        | ArrayLiteral
   *        | ObjectLiteral
   *        | FunctionLiteral
   */
   
  Term: function() {
    var value = this.eat(['string literal', 'number literal', 'identifier'])
    if (!value) {
      if (this.eat('paren', '(')) {
        if (this.expect('keyword', isTypeName)) {
          var type = this.Type()
          if (!this.eat('paren', ')')) {
            this.error('Expected `)` closing typecast.')
          }
          var memberOrCallExpression = this.MemberOrCallExpression()
          value = new Symbol('typecast', { children: [type, memberOrCallExpression] })
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
  },
  
  /**
   * Type ::= Type "(" TypeList ")"
   *        | Type "*"
   *        | <type keyword>
   */
   
  Type: function() {
    var type
    var typeNameToken = this.eat('keyword')
    if (!typeNameToken || isTypeName(typeNameToken.value) == -1) {
      this.error('Expected type name.')
    }
    if (typeNameToken.value == 'struct') {
      var structNameToken = this.eat('identifier', undefined, undefined, false)
      if (!structNameToken) {
        this.error('Expected struct name.')
      }
      type = new Symbol('type', { children: [typeNameToken, structNameToken] })
    } else {
      type = new Symbol('type', { children: [typeNameToken] })
    }
    for (;;) {
      var pointerToken = this.eat('multiplication operator', '*')
      if (pointerToken) {
        type = new Symbol('type', { children: [pointerToken, type] })
      } else if (this.eat('paren', '(')) {
        var typeList = this.TypeList()
        if (!this.eat('paren', ')')) {
          this.error('Expected `)` after type list')
        }
        type = new Symbol('type', { children: [type, typeList] })
      } else {
        break
      }
    }
    return type
  },
  
  /**
   * TypeList ::= ""
   *            | TypeListNonEmpty
   *
   * TypeListNonEmpty ::= TypeListNonEmpty "," Type
   *                    | Type
   */
   
  TypeList: function() {
    var types = []
    if (!this.expect(')')) {
      for (;;) {
        types.push(this.Type())
        if (!this.eat('comma')) {
          break;
        }
      }
    }
    return new Symbol('type list', { children: types })
  },

  /**
   * ArrayLiteral ::= "[" "]"
   *                | "[" ArrayLiteralElements "]"
   *
   * ArrayLiteralElements ::= ArrayLiteralElements "," AssignmentExpression
   *                        | AssignmentExpression
   */
   
  ArrayLiteral: function() {
    this.eat('square bracket', '[')
    if (this.eat('square bracket', ']')) {
      return new Symbol('array literal', { children: [] })
    } else {
      var contents = []
      for (;;) {
        try {
          contents.push(this.AssignmentExpression())
          if (this.eat('square bracket', ']')) {
            return new Symbol('array literal', { children: contents })
          } else {
            this.automaticComma()
          }
        } catch (err) {
          if (err.name !== 'KatanaError') { throw err }
          var eaten = this.eat(['newline', 'comma', 'square bracket'], undefined, '*') // skip until newline or comma
          if (eaten && eaten.type === 'square bracket') {
            if (eaten.value == ']') {
              return new Symbol('array literal', { children: contents })
            } else {
              this.eat(['newline', 'comma'])
            }
          } else {
            if (this.expect('end of file')) {
              return new Symbol('array literal', { children: contents })
            }
          }
        }
      }
    }
  },
  
  /**
   * ObjectLiteral ::= "{" "}"
   *                 | "{" ObjectLiteralProperties "}"
   *
   * ObjectLiteralProperties ::= ObjectLiteralProperties "," ObjectLiteralProperty
   *                           | ObjectLiteralProperty
   *
   * ObjectLiteralProperty ::= <identifier> ":" AssignmentExpression
   *                         | <string literal> ":" AssignmentExpression
   *                         | <number literal> ":" AssignmentExpression
   *                         | <identifier>
   */

  ObjectLiteral: function() {
    var openingBracket = this.expect('curly bracket', '{')
    if (openingBracket.meta.generatedByOffside) {
      this.error('Expected value.')
    }
    this.eat('curly bracket', '{')
    if (this.eat('curly bracket', '}')) {
      return new Symbol('object literal', { line: openingBracket.line, column: openingBracket.column })
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
            return new Symbol('object literal', { children: contents })
          } else {
            this.automaticComma()
          }
        } catch (err) {
          if (err.name !== 'KatanaError') { throw err }
          var eaten = this.eat(['newline', 'comma', 'curly bracket'], undefined, '*') // skip until newline or comma
          if (eaten && eaten.type === 'curly bracket') {
            if (eaten.value == '}') {
              return new Symbol('object literal', { children: contents })
            } else {
              this.eat(['newline', 'comma'])
            }
          } else {
            if (this.expect('end of file')) {
              return new Symbol('object literal', { children: contents })
            }
          }
        }
      }
    }
  },
  
  /**
   * FunctionLiteral ::= "take" DeclarationList Block
   *                   | "do" Block
   */
   
  FunctionLiteral: function() {
    if (this.eat('keyword', '\\take')) {
      return new Symbol('function literal', { children: [this.DeclarationList(), this.Block()] })
    } else if (this.eat('keyword', '\\do')) {
      return new Symbol('function literal', { children: [this.Block()] })
    }
  }
}

  /**
   * Take the output from the rewriter and parse it
   * @param {Object} rewriterOutput
   */
var parser = function(rewriterOutput) {
  var parser = new Parser(rewriterOutput)
  return { program: parser.Program(), errors: parser.errors }
}

exports = module.exports = parser