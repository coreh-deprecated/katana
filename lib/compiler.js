var fs = require('fs')
var ansi = require('ansi')
var path = require('path')
var uuid = require('node-uuid')

var misc = require('./misc')

var lexer = require('./lexer')
var rewriter = require('./rewriter')
var parser = require('./parser')
var generator = require('./generator')

var Compiler = module.exports = function() {
  this.modules = {}
  this.errors = []
  this.failed = false
}

var compileCode = function(code, modulePath, options) {
  var lexerOutput = lexer(code)
  var rewriterOutput = rewriter(lexerOutput)
  var parserOuput = parser(rewriterOutput, this, modulePath, options)
  return parserOuput
}

/**
 * Resolves an import path.
 */
var resolvePath = function(importPath, fromPath) {
  var modulePath
  if (typeof fromPath == 'undefined') {
    modulePath = importPath
  } else {
    if (importPath.match(/^\./)) {
      // Relative path
      modulePath = path.join(path.dirname(fromPath), importPath)
      if (path.existsSync(modulePath) && fs.statSync(modulePath).isDirectory()) {
        modulePath = modulePath + '/index.k'
      } else {
        modulePath = modulePath + '.k'
      }
    } else {
      // Absolute path
      var dir = path.dirname(fromPath)
      for (;;) {
        modulePath = path.join(dir, 'modules', importPath)
        if (path.existsSync(modulePath) && fs.statSync(modulePath).isDirectory()) {
          modulePath = path.join(modulePath, 'index.k')
          if (path.existsSync(modulePath) && fs.statSync(modulePath).isFile()) {
            break;
          }
        } else {
          modulePath = modulePath + '.k'
          if (path.existsSync(modulePath) && fs.statSync(modulePath).isFile()) {
            break;
          }
        }
        if (dir != '/') {
          dir = path.join(dir, '..')
        } else {
          modulePath = path.join(__dirname, '..', 'stdlib', importPath)
          if (path.existsSync(modulePath) && fs.statSync(modulePath).isDirectory()) {
            modulePath = path.join(modulePath, 'index.k')
          } else {
            modulePath = modulePath + '.k'
          }
          break;
        }
      }
    }
  }
  return modulePath
}

Compiler.prototype.compile = function(importPath, fromPath) {
  var modulePath = resolvePath(importPath, fromPath)
  
  var module = this.modules[modulePath]
  if (!module) {
    // Initialize the module
    this.modules[modulePath] = module = { uuid: uuid.v4().replace(/\-/g, ''), path: modulePath }
    
    // Read source code from filesystem
    module.code = fs.readFileSync(modulePath, 'utf-8')
    
    // Compile code
    var result = compileCode.call(this, module.code, modulePath, {})
    
    // Add module path information to errors
    result.errors.forEach(function(e) {
      e.modulePath = modulePath
    })
    
    // Store errors
    Array.prototype.push.apply(this.errors, result.errors)
    
    // Filter the fatal errors
    var fatalErrors = result.errors.filter(function(e) { return e.severity == 'error' })
    
    // Only generate code if no fatal errors were reported
    if (fatalErrors.length > 0) {
      this.failed = true
    } else {
      module.syntaxTree = result.syntaxTree
      
      module.intermediateRepresentation = generator(module)
    }
    
    // Store Module Exports
    module.exports = result.exports
  } else {
    // If the module is present, but no export information is available
    // the module is still compiling, and we've found a cyclic module dependency.
    // To avoid infinite recursion, we compile the module suppressing further
    // imports
    if (!module.exports) {
      module.exports = compileCode.call(this, module.code, modulePath, { suppressImports: true }).exports
    }
  }
  return module
}

Compiler.prototype.writeErrors = function(stream) {
  var cursor = ansi(stream)
  this.errors.forEach(function(err) {
    var code = this.modules[err.modulePath].code
    var lines = code.split('\n')
    cursor.write(path.relative(process.cwd(), err.modulePath) + ' (')
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
