var ansi = require('ansi')

var pipeline = exports.pipeline = function() {
  var a = arguments
  return function(x) {
    for (var i = 0; i < a.length; i++) {
      x = a[i](x)
    }
    return x
  }
}

var writeTree = exports.writeTree = function(stream, code, level) {
  if (typeof level === 'undefined') {
    level = 0
  }
  var nest = Array(level+1).join('  ')
  var cursor = ansi(stream)
  stream.write(nest+code.type)
  if (code.value) {
    cursor.blue()
    stream.write(' ' + code.value)
    cursor.reset()
  }
  stream.write('\n')
  code.children.forEach(function(child) {
    writeTree(stream, child, level + 1)
  })
}

var writeErrors = exports.writeErrors = function(stream, filename, code, errors) {
  var lines = code.split('\n')
  var cursor = ansi(stream)
  errors.forEach(function(err) {
    stream.write(filename + ' (')
    cursor.blue()
    stream.write('line ' + err.line)
    cursor.reset()
    stream.write(': ')
    cursor.blue()
    stream.write('column ' + err.startColumn)
    cursor.reset()
    stream.write(') ')
    cursor.red()
    stream.write(err.type + ' ' + err.severity + ': ')
    cursor.reset()
    stream.write(err.message + '\n')
    cursor.grey()
    stream.write(lines[err.line-1] + '\n')
    cursor.green()
    var l = Math.max(1, err.endColumn - err.startColumn)
    stream.write(Array(err.startColumn).join(' ') + Array(l+1).join('^') + '\n')
    cursor.reset()
    stream.write('\n') 
  })
}

var KatanaError = exports.KatanaError = function(type, severity, message, line, startColumn, endColumn) {
  this.name = "KatanaError"
  this.type = type
  this.severity = severity
  this.message = message
  this.line = line
  this.startColumn = startColumn
  this.endColumn = endColumn
}

KatanaError.prototype = new Error()
KatanaError.prototype.constructor = KatanaError

