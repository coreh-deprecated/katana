// Constructor for Lexer
var Lexer = module.exports = function() {
    this.lines = null
    this.indentation = null
    this.indentationStack = [0]
    this.tokenQueue = []
    this.lastTokenReturned = null
    this.currentLine = 0
    this.currentColumn = 0
    this.storedToken = null
}

// This function is called by JISON upon initialization. 
// It takes a single argument: inputText, a string containing the whole
// source file.
Lexer.prototype.setInput = function(inputText) {
    this.lines = inputText.split('\n')
    var indentation = this.indentation = []
    this.lines.forEach(function(line) {
        
        // Measure and store indentation of line
        indentation.push(line.match(/^\s*/)[0].length)
    })
}

// This function is called by JISON every time it needs a new token.
// It should return a token name, and set the yytext and yylineno values.
Lexer.prototype.lex = function() {
    var result;
    
    if (this.storedToken) {
        result = this.storedToken
        this.storedToken = null
    } else {
        result = this.doLex()
    
        this.lastTokenReturned = result;
    
        if (result == 'KEYWORD') {
            switch (this.yytext) {
                case 'if': result += '_IF'; break;
                case 'int': result += '_INT'; break;
                case 'float': result += '_FLOAT'; break;
                case 'else': result += '_ELSE'; break;
                default:
                    throw new Error('Invalid keyword')
            }
        }

        if (result == 'IDENTIFIER') {
            if (!this.yy.scopes.current().get(this.yytext)) {
                switch (this.yytext) {
                    case 'if': result = 'KEYWORD_IF'; break;
                    case 'int': result = 'KEYWORD_INT'; break;
                    case 'float': result = 'KEYWORD_FLOAT'; break;
                    case 'else': result = 'KEYWORD_ELSE'; break;
                    default:
                        // keep identifier
                }
            }
        }
    }
    
    if (this.tokenQueue.length > 0) {
        var queuedToken = this.tokenQueue.shift()
        if (queuedToken.replaceableBy == result) {
            return result;
        } else {
            this.storedToken = result
            return queuedToken.token
        }
    }
    
    return result;
}

Lexer.prototype.doLex = function() {
    for (;;) {
        
        this.yylineno = this.currentLine
        var ch = this.nextChar()
        switch (true) {
            case ch == null:
                return false;
            
            // Simple (non-interpolating) strings
            case ch == "'":
                var contents = []
                while (ch = this.nextChar(), ch != null && ch != "'") {
                    contents.push(ch)
                }
                if (ch == null) {
                    throw new Error('Unexpected end of file')
                }
                this.yytext = contents.join('')
                return 'STRING_LITERAL'
        
            // All exotic flavours of numbers
            case ch == '0':
                // hexadecimal
                if (this.peekNextChar() == 'x') {
                    this.nextChar()
                    var contents = []
                    while (ch = this.peekNextChar(), ch != null && ch.match(/[0-9A-Fa-f]/)) {
                        this.nextChar()
                        contents.push(ch)
                    }
                    if (contents.length > 0) {
                        this.yytext = parseInt(contents.join(''), 16)
                        return 'INTEGER_LITERAL'
                    } else {
                        throw new Error('Unexpected token')
                    }
                }
            
                // binary
                if (this.peekNextChar() == 'b') {
                    this.nextChar()
                    var contents = []
                    while (ch = this.peekNextChar(), ch != null && ch.match(/[01]/)) {
                        this.nextChar()
                        contents.push(ch)
                    }
                    if (contents.length > 0) {
                        this.yytext = parseInt(contents.join(''), 2)
                        return 'INTEGER_LITERAL'
                    } else {
                        throw new Error('Unexpected token')
                    }
                }
            
                // No octal support. Who uses octal these days?
            
                var contents = []
            case !!ch.match(/[1-9]/):
                var contents = [ch]
                var isFloat = false
                while (ch = this.peekNextChar(), ch != null && ch.match(/[0-9\.]/)) {
                    this.nextChar()
                    if (ch == '.') {
                        if (isFloat) {
                            throw new Error('Unexpected token')
                        } else {
                            isFloat = true
                        }
                    }
                    contents.push(ch)
                }
                if (isFloat) {
                    this.yytext = parseFloat(contents.join(''))
                    return 'FLOAT_LITERAL'
                } else {
                    this.yytext = parseInt(contents.join(''), 10)
                    return 'INTEGER_LITERAL'                
                }
        
            // Add DEDENT and INDENT
            case ch == '\n':
                switch (this.lastTokenReturned) {
                    // Tokens that trigger INDENT and DEDENT if at the end of a statement
                    case 'IDENTIFIER':
                    case 'KEYWORD':
                    case 'STRING_LITERAL':
                    case 'FLOAT_LITERAL':
                    case 'INTEGER_LITERAL':
                    case 'DEDENT':
                    case '->':
                    case '--':
                    case '++':
                    case ';':
                    case ']':
                    case '}':
                    case ')':
                        var currentIndentation = this.indentation[this.currentLine] || 0
                        if (currentIndentation > this.indentationStack[this.indentationStack.length-1]) {
                            this.indentationStack.push(currentIndentation)
                            return 'INDENT'
                        } else {
                            if (this.indentationStack[this.indentationStack.length-1] == currentIndentation) {
                                // -> triggers INDENT and DEDENT, but does not trigger ;
                                if (this.lastTokenReturned != '->') {
                                    return ';'
                                }
                            }
                            while (currentIndentation < this.indentationStack[this.indentationStack.length-1]) {
                                this.indentationStack.pop()
                                this.tokenQueue.push({ token: 'DEDENT' })
                            }
                            if (this.indentationStack[this.indentationStack.length-1] != currentIndentation) {
                                throw new Error('Indentation error')
                            } else {
                                this.tokenQueue.push({ token: ';', replaceableBy: 'KEYWORD_ELSE' })
                                break;
                            }
                        }
                    default:
                        break;
                }
                break;
            
            case ch == '+':
                ch = this.peekNextChar()
                if (ch == '+') {
                    this.nextChar();
                    return '++'
                } else if (ch == '=') {
                    this.nextChar();
                    return '+='
                } else {
                    return '+'
                }

            case ch == '-':
                ch = this.peekNextChar()
                if (ch == '-') {
                    this.nextChar();
                    return '--'
                } else if (ch == '=') {
                    this.nextChar();
                    return '-='
                } if (ch == '>') {
                    this.nextChar();
                    return '->'
                } else {
                    return '-'
                }

            case ch == '*':
                ch = this.peekNextChar()
                if (ch == '=') {
                    this.nextChar();
                    return '*='
                } else {
                    return '*'
                }

            case ch == '/':
                ch = this.peekNextChar()
                if (ch == '/') {
                    while (ch = this.nextChar(), ch != null && ch != '\n') {
                        // eat comment
                    }
                    break;
                } if (ch == '*') {
                    while (ch = this.nextChar(), ch != null) {
                        // eat comment, and stop on */
                        if (ch == '*') {
                            if (ch = this.peekNextChar(), ch == '/') {
                                this.nextChar()
                                break;
                            }
                        }
                    }
                    if (ch == null) {
                        throw new Error('Unclosed comment')
                    }
                    break;
                } else if (ch == '=') {
                    this.nextChar();
                    return '/='
                } else {
                    return '/'
                }

            case ch == '=':
                ch = this.peekNextChar()
                if (ch == '=') {
                    this.nextChar();
                    return '=='
                } else {
                    return '='
                }

            case ch == ':':
                ch = this.peekNextChar()
                if (ch == '=') {
                    this.nextChar();
                    return ':='
                } else {
                    return ':'
                }

            case ch == '%':
                ch = this.peekNextChar()
                if (ch == '=') {
                    this.nextChar();
                    return '%='
                } else {
                    return '%'
                }

            case ch == '^':
                ch = this.peekNextChar()
                if (ch == '=') {
                    this.nextChar();
                    return '^='
                } if (ch == '^') {
                    this.nextChar();
                    ch = this.peekNextChar()
                    if (ch == '=') {
                        this.nextChar();
                        return '^^='
                    } else {
                        return '^^'
                    }
                } else {
                    return '^'
                }
                
            case ch == '&':
                ch = this.peekNextChar()
                if (ch == '=') {
                    this.nextChar();
                    return '&='
                } if (ch == '&') {
                    this.nextChar();
                    ch = this.peekNextChar()
                    if (ch == '=') {
                        this.nextChar();
                        return '&&='
                    } else {
                        return '&&'
                    }
                } else {
                    return '&'
                }
                
            case ch == '|':
                ch = this.peekNextChar()
                if (ch == '=') {
                    this.nextChar();
                    return '|='
                } if (ch == '|') {
                    this.nextChar();
                    if (ch == '=') {
                        this.nextChar();
                        return '||='
                    } else {
                        return '||'
                    }
                } else {
                    return '|'
                }
                
            case ch == '>':
                ch = this.peekNextChar()
                if (ch == '>') {
                    this.nextChar()
                    return '>>'
                } else if (ch == '=') {
                    this.nextChar()
                    return '>='
                } else {
                    return '>'
                }

            case ch == '<':
                ch = this.peekNextChar()
                if (ch == '<') {
                    this.nextChar()
                    return '<<'
                } else if (ch == '>') {
                    this.nextChar()
                    return '<>'
                } else if (ch == '=') {
                    this.nextChar()
                    return '<='
                } else {
                    return '<'
                }
                
            case ch == '!':
                ch = this.peekNextChar()
                if (ch == '=') {
                    this.nextChar()
                    return '!='
                } else {
                    return '!'
                }

            case ch == '[':
            case ch == ']':
            case ch == '.':
            case ch == ',':
            case ch == ';':
            case ch == '{':
            case ch == '}':
            case ch == '(':
            case ch == ')':
                return ch

            case !!ch.match(/[\w\_\$]/):
                var contents = [ch]
                while (ch = this.peekNextChar(), ch != null && ch.match(/[\w\_\$0-9]/)) {
                    this.nextChar()
                    contents.push(ch)
                }
                this.yytext = contents.join('')
                return 'IDENTIFIER'

            case ch == '\\':
                var contents = []
                while (ch = this.peekNextChar(), ch != null && ch.match(/[\w\_\$0-9]/)) {
                    this.nextChar()
                    contents.push(ch)
                }
                this.yytext = contents.join('')
                return 'KEYWORD'

            case !!ch.match(/\s/):
                // ignore whitespace
                break;
                        
            default:
                throw new Error('Unexpected token `' + ch + '`')
        }
    }
}

Lexer.prototype.peekNextChar = function() { 
    return this.nextChar(true)
}

Lexer.prototype.nextChar = function(peek) {
    if (this.lines == null) {
        throw new Error('Lexer not properly initialized')
    }
    
    // Check for EOF
    if (this.currentLine >= this.lines.length) {
        return null;
    }

    var line = this.lines[this.currentLine]
    
    // Check for EOL
    if (this.currentColumn >= line.length) {
        if (!peek) {
            this.currentColumn = 0
            this.currentLine++
        }
        return '\n'
    } else {
        if (!peek) {
            return line.charAt(this.currentColumn++)
        } else {
            return line.charAt(this.currentColumn)
        }
    }        
}
/*
var t = new Lexer()
t.setInput(
"'a'\n" +
"  ('a')\n" +
"  'a'\n" +
"    'a'\n" +
" \t \t 'a'\n"
)

var token;
while (token = t.lex()) {
    console.log(token)
}
    */
    