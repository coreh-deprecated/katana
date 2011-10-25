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
    '&&= && & |= ||= || | >> >= > << <= < != ! [ ] . , ; { } ' +
    'IDENTIFIER KEYWORD'

var grammar = {
    
    program: [
        ['code',                                         'return new yy.Program($1)']
    ],
    
    code: _(
        'expression',                                   function() { return new yy.Code($1) },
        'code ; expression',                            function() { $1.push($3); return $1 },
        'code ;',
        ''
    ),
    
    expression: _(
        'value',
        'operation'
    ),
    
    value: _(
        'literal',
        'block'
    ),
    
    block: _(
        'INDENT code DEDENT',                           function() { return new yy.Block($2) }   
    ),
    
    literal: _(
        'INTEGER_LITERAL',                              function() { return new yy.Literal(yytext, 'int') },
        'FLOAT_LITERAL',                                function() { return new yy.Literal(yytext, 'float') },
        'STRING_LITERAL',                               function() { return new yy.Literal(yytext, 'string') }
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

parser.yy = require('./Nodes')

var fs = require('fs')
var program = fs.readFileSync('test.k', 'utf-8')

var result = parser.parse(program).generate()
console.log(result)