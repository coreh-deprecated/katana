var _throw = exports.throw = function(type, message, line, position) {
  var str = type + ' error (line ' + line.number + ', column ' + position + ')' + '\n' + message + '\n' + 
    line.value + '\n' +
    (new Array(position)).join(' ') + '^'
  throw new Error(str)
};