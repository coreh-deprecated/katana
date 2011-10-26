var Parser = require("jison").Parser
var Lexer = require("./Lexer")

// This helper code is somewhat based on the code from the CoffeScript parser
var o = function(rule, action, options) {
    var unwrap = function(action) {
        var actionString = action.toString()
        var match = actionString.match(/^function\s*\(\)\s*\{\s*return\s*([\s\S]*);\s*\}/) 
        if (match) {
            return match[1]
        } else {
            return '(' + actionString + ')()'
        }
    }
    rule = rule.replace(/\s{2,}/, ' ')
    if (!action) {
        return [rule, '$$ = $1']
    } else {
        var result = [rule, '$$ = (' + unwrap(action) + ')']
        if (options) {
            result.push(options)
        }
        return result
    }
}

var _ = function() {
    var result = []
    var temp
    for (var i = 0; i < arguments.length; i++) {
        if (typeof arguments[i] == 'string' || arguments[i] instanceof String) {
            if (temp) {
                result.push(o.apply(this, temp))
            }
            temp = [arguments[i]]
        } else { 
            temp.push(arguments[i])
        }
        
    }
    if (temp) {
        result.push(o.apply(this, temp))
    }
    return result
}

var tokens = 
    'STRING_LITERAL INTEGER_LITERAL FLOAT_LITERAL INDENT DEDENT ' + 
    '++ += + -- -= -> - *= * /= / == = := : % %= ^= ^^= ^^ ^ &= ' +
    '&&= && & |= ||= || | >> >= > << <= < != ! [ ] . , ; { } ( ) ' +
    'IDENTIFIER KEYWORD_IF KEYWORD_FLOAT KEYWORD_INT KEYWORD_ELSE'

var grammar = {
    
    program: [
        ['code',                                        'return new yy.Program($1)'],
        ['',                                            'return new yy.Program()']
    ],
    
    code: _(
        'expression',                                   function() { return new yy.Code($1) },
        'code ; expression',                            function() { $1.push($3); return $1 },
        'code ;'
    ),
    
    expression: _(
        'value',
        'operation',
        'declaration',
        'assignment'
    ),
    
    value: _(
        'literal',
        'parental',
        'block',
        'statement',
        'assignable'
    ),
    
    assignable: _(
        'IDENTIFIER',                                   function() { return new yy.Variable(yytext) }
    ),
    
    statement: _(
        'KEYWORD_IF expression block',                  function() { return new yy.If($2, $3) },
        'KEYWORD_IF expression block KEYWORD_ELSE block',
                                                        function() { return new yy.If($2, $3, $5) }
    ),
    
    declaration: _(
        'type declaration_list',                        function() { return new yy.Declaration($1, $2) }
    ),
    
    type: _(
        'KEYWORD_INT',
        'KEYWORD_FLOAT'
    ),
    
    declaration_list: _(
        'declaration_list , IDENTIFIER',                function() { return $1.push($3) },
        'IDENTIFIER',                                   function() { return [yytext] }
    ),
    
    parental: _(
        '( code )',                                     function() { return new yy.Parental($2) } 
    ),
    
    block: _(
        'INDENT code DEDENT',                           function() { return new yy.Block($2) } 
    ),
    
    literal: _(
        'INTEGER_LITERAL',                              function() { return new yy.Literal(yytext, 'int') },
        'FLOAT_LITERAL',                                function() { return new yy.Literal(yytext, 'float') },
        'STRING_LITERAL',                               function() { return new yy.Literal(yytext, 'string') }
    ),
    
    assignment: _(
        'assignable = expression',                      function() { return new yy.Assignment($1, $3) }
    ),
        
    operation: _(
        'expression +  expression',                     function(){ return new yy.Operation('+', $1, $3) },
        'expression -  expression',                     function(){ return new yy.Operation('-', $1, $3) },
        
        'expression *  expression',                     function(){ return new yy.Operation('*', $1, $3) },
        'expression /  expression',                     function(){ return new yy.Operation('/', $1, $3) },
        
        'expression >> expression',                     function(){ return new yy.Operation('>>', $1, $3) },
        'expression << expression',                     function(){ return new yy.Operation('<<', $1, $3) },
        
        'expression >  expression',                     function(){ return new yy.Operation('>', $1, $3) },
        'expression >= expression',                     function(){ return new yy.Operation('>=', $1, $3) },
        'expression <  expression',                     function(){ return new yy.Operation('<', $1, $3) },
        'expression <= expression',                     function(){ return new yy.Operation('<=', $1, $3) },
        'expression == expression',                     function(){ return new yy.Operation('==', $1, $3) },
        'expression != expression',                     function(){ return new yy.Operation('!=', $1, $3) },
        'expression <> expression',                     function(){ return new yy.Operation('<>', $1, $3) },
        
        'expression &  expression',                     function(){ return new yy.Operation('&', $1, $3) },
        'expression && expression',                     function(){ return new yy.Operation('&&', $1, $3) },
        'expression |  expression',                     function(){ return new yy.Operation('|', $1, $3) },
        'expression || expression',                     function(){ return new yy.Operation('||', $1, $3) },
        'expression ^  expression',                     function(){ return new yy.Operation('^', $1, $3) },
        'expression ^^ expression',                     function(){ return new yy.Operation('^^', $1, $3) }
        
    )
}

var operators = [
    ['right', 'KEYWORD_IF'],
    ['right', '='],
    ['left', '|', '||', '&', '&&', '^', '^^'],
    ['left', '>', '>=', '==', '<', '<=', '!=', '<>'],
    ['left', '<<', '>>'],
    ['left', '+', '-'],
    ['left', '*', '/'],
    ['nonassoc', '++', '--'],
]

var parser = new Parser({
    tokens: tokens,
    bnf: grammar,
    operators: operators,
    start: 'program'
})

parser.lexer = new Lexer()

parser.yy = require('./Generator')

var fs = require('fs')
var program = fs.readFileSync('test.k', 'utf-8')

var result = parser.parse(program).generate()
console.log(result)