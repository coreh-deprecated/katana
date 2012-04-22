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

var Type = exports.Type = function(type, subtypes) {
  this.type = type
  this.subtypes = subtypes
}

Type.prototype.equals = function(that) {
  if (this.type != that.type) {
    return false;
  }
  if (this.subtypes) {
    if (!that.subtypes) {
      return false
    } else if (that.subtypes.length != this.subtypes.length) {
      return false
    } else {
      for (var i = 0; i < this.subtypes.length; i++) {
        if (!this.subtypes[i].equals(that.subtypes[i])) {
          return false
        }
      }
    }
  } else {
    if (that.subtypes) {
      return false
    }
  }
  return true
}