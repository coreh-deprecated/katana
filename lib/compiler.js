var fs = require('fs')
var ansi = require('ansi')

var misc = require('./misc')

var lexer = require('./lexer')
var rewriter = require('./rewriter')
var parser = require('./parser')

var Compiler = module.exports = function() {
  this.modules = {}
  this.errors = []
  this.failed = false
}

var compileCode = function(code, options) {
  var lexerOutput = lexer(code)
  var rewriterOutput = rewriter(lexerOutput)
  var parserOuput = parser(rewriterOutput, this, options)
  return parserOuput
}

Compiler.prototype.compile = function(modulePath) {
  var module = this.modules[modulePath]
  if (!module) {
    // Initialize the module
    this.modules[modulePath] = module = {}
    
    // Read source code from filesystem
    module.code = fs.readFileSync(modulePath, 'utf-8')
    
    // Compile code
    var result = compileCode(module.code)
    
    // Add module path information to errors
    result.errors.forEach(function(e) {
      e.modulePath = modulePath
    })
    
    // Store errors
    Array.prototype.push.apply(this.errors, result.errors)
    
    // Filter the fatal errors
    var fatalErrors = result.errors.filter(function(e) { return e.severity == 'error' })
    
    // Only store the AST if no fatal errors were reported
    if (fatalErrors.length > 0) {
      this.failed = true
    } else {
      module.syntaxTree = result.syntaxTree
      misc.writeTree(process.stdout, module.syntaxTree)
    }
    
    // Store Module Exports
    module.exports = result.exports
  } else {
    // If the module is present, but no export information is available
    // the module is still compiling, and we've found a cyclic module dependency.
    // To avoid infinite recursion, we compile the module suppressing further
    // imports
    if (!module.exports) {
      module.exports = compile(modulePath, { suppressImports: true }).exports
    }
  }
  return module
}

Compiler.prototype.writeErrors = function(stream) {
  var cursor = ansi(stream)
  this.errors.forEach(function(err) {
    var code = this.modules[err.modulePath].code
    var lines = code.split('\n')
    cursor.write(err.modulePath + ' (')
    cursor.blue().write('line ' + err.line).reset()
    stream.write(': ')
    cursor.blue().write('column ' + err.startColumn).reset()
    stream.write(') ')
    if (err.severity == 'error') {
      cursor.red()
    } else {
      cursor.cyan()
    }
    stream.write(err.severity + ': ')
    cursor.reset()
    stream.write(err.message + '\n')
    cursor.grey().write(lines[err.line-1] + '\n')
    cursor.green()
    var l = Math.max(1, err.endColumn - err.startColumn)
    stream.write(Array(err.startColumn).join(' ') + Array(l+1).join('^') + '\n')
    cursor.reset()
    stream.write('\n') 
  }, this)
}
