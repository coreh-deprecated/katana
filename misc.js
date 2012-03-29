var pipeline = exports.pipeline = function() {
  var a = arguments
  return function(x) {
    for (var i = 0; i < a.length; i++) {
      x = a[i](x)
    }
    return x
  }
}

var join = exports.join = function(arrayOfArrays) {
  return Array.prototype.concat.apply([], arrayOfArrays)
}

var split = exports.split = function(array, f) {
  var temp = []
  var result = []
  array.forEach(function(element) {
    if (f(element)) {
      result.push(temp)
      temp = []
    } else {
      temp.push(element)
    }
  })
  result.push(temp)
  return result
}

var unfold = exports.unfold = function(array, f) {
  return join(array.map(f))
}

var pluralize = exports.pluralize = function(n, singular, plural) {
  if (n == 1) { 
    return n + ' ' + singular
  } else {
    return n + ' ' + plural
  }
}