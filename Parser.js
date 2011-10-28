var Parser = require("jison").Parser
var Lexer = require("./Lexer")
var ScopeStack = require("./Scopes")


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
        ['code',                                        'return new yy.nodes.Program(yy, $1)'],
        ['',                                            'return new yy.nodes.Program(yy)']
    ],
    
    code: _(
        'expression',                                   function() { return new yy.nodes.Code(yy, $1) },
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
        'assignable',
        'function'
    ),
            
    function_arrow: _(
        '->',                                           function() { return 'var' },
        '- type ->',                                    function() { return $2 },
        '-/>',                                          function() { return 'void' }
    ),
    
    'function_arguments': _(
        'function_arguments, type declaration_name',
        'type declaration_name'
    ),
        
    'function': _(
        'function_arrow block',
        'PARAM_START function_arguments PARAM_END function_arrow block'
    ),
    
    assignable: _(
        'IDENTIFIER',                                   function() { return new yy.nodes.Variable(yy, yytext) }
    ),
    
    statement: _(
        'KEYWORD_IF expression block',                  function() { return new yy.nodes.If(yy, $2, $3) },
        'KEYWORD_IF expression block KEYWORD_ELSE block',
                                                        function() { return new yy.nodes.If(yy, $2, $3, $5) }
    ),
    
    declaration: _(
        'type declaration_list',                        function() { return new yy.nodes.Declaration(yy, $1, $2) }
    ),
    
    type: _(
        'KEYWORD_INT',
        'KEYWORD_FLOAT'
    ),
    
    declaration_name: _(
        'IDENTIFIER',                                   function() { return yytext },
        'KEYWORD_INT',                                  function() { return yytext },
        'KEYWORD_FLOAT',                                function() { return yytext }
    ),
    
    declaration_list: _(
        'declaration_list , declaration_name',          function() { $1.push($3); return $1 },
        'declaration_name',                             function() { return [yytext] }
    ),
    
    parental: _(
        '( code )',                                     function() { return new yy.nodes.Parental(yy, $2) } 
    ),
    
    block: _(
        'INDENT code DEDENT',                           function() { return new yy.nodes.Block(yy, $2) } 
    ),
    
    literal: _(
        'INTEGER_LITERAL',                              function() { return new yy.nodes.Literal(yy, yytext, 'int') },
        'FLOAT_LITERAL',                                function() { return new yy.nodes.Literal(yy, yytext, 'float') },
        'STRING_LITERAL',                               function() { return new yy.nodes.Literal(yy, yytext, 'string') }
    ),
    
    assignment: _(
        'assignable = expression',                        function() { return new yy.nodes.Assignment(yy, $1, $3) }
    ),
        
    operation: _(
        'expression +  expression',                     function(){ return new yy.nodes.Operation(yy, '+', $1, $3) },
        'expression -  expression',                     function(){ return new yy.nodes.Operation(yy, '-', $1, $3) },
        
        'expression *  expression',                     function(){ return new yy.nodes.Operation(yy, '*', $1, $3) },
        'expression /  expression',                     function(){ return new yy.nodes.Operation(yy, '/', $1, $3) },
        
        'expression >> expression',                     function(){ return new yy.nodes.Operation(yy, '>>', $1, $3) },
        'expression << expression',                     function(){ return new yy.nodes.Operation(yy, '<<', $1, $3) },
        
        'expression >  expression',                     function(){ return new yy.nodes.Operation(yy, '>', $1, $3) },
        'expression >= expression',                     function(){ return new yy.nodes.Operation(yy, '>=', $1, $3) },
        'expression <  expression',                     function(){ return new yy.nodes.Operation(yy, '<', $1, $3) },
        'expression <= expression',                     function(){ return new yy.nodes.Operation(yy, '<=', $1, $3) },
        'expression == expression',                     function(){ return new yy.nodes.Operation(yy, '==', $1, $3) },
        'expression != expression',                     function(){ return new yy.nodes.Operation(yy, '!=', $1, $3) },
        'expression <> expression',                     function(){ return new yy.nodes.Operation(yy, '<>', $1, $3) },
        
        'expression &  expression',                     function(){ return new yy.nodes.Operation(yy, '&', $1, $3) },
        'expression && expression',                     function(){ return new yy.nodes.Operation(yy, '&&', $1, $3) },
        'expression |  expression',                     function(){ return new yy.nodes.Operation(yy, '|', $1, $3) },
        'expression || expression',                     function(){ return new yy.nodes.Operation(yy, '||', $1, $3) },
        'expression ^  expression',                     function(){ return new yy.nodes.Operation(yy, '^', $1, $3) },
        'expression ^^ expression',                     function(){ return new yy.nodes.Operation(yy, '^^', $1, $3) }
        
    )
}

var operators = [
    ['right', '->'],
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

parser.yy = {}
parser.yy.nodes = require('./Generator')
parser.yy.scopes = new ScopeStack()

var fs = require('fs')
var program = fs.readFileSync('test.k', 'utf-8')

var result = parser.parse(program).generate()
console.log(result)