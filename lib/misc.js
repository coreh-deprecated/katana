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

/**
 * Calculate the Levenshtein distance between two strings
 */
var levenshteinDistance = exports.levenshteinDistance = function (a, b) {
  var d = []
  var m = a.length
  var n = b.length

  if (m == 0) {
    return n
  }
  
  if (n == 0) {
    return m
  }

  for (var i = 0; i <= m; i++) {
    d.push([i])
  }
  
  for (var j = 0; j <= n; j++) {
    d[0][j] = j
  }

  for (var j = 1; j <= n; j++) {
    for (var i = 1; i <= m; i++) {
      if (a[i-1] == b[j-1]) {
        d[i][j] = d[i - 1][j - 1]
      } else {
        d[i][j] = Math.min(d[i-1][j], d[i][j-1], d[i-1][j-1]) + 1
      }
    }
  }
  
  return d[m][n];
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

