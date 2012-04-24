var pipeline = exports.pipeline = function() {
  var a = arguments
  return function(x) {
    for (var i = 0; i < a.length; i++) {
      x = a[i](x)
    }
    return x
  }
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

