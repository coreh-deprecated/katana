var Type = module.exports = function(type, subtypes) {
  this.type = type
  this.subtypes = subtypes
}

/**
 * Datatype sizes
 */
Type.sizeof = {
  'int': (process.arch == 'x64') ? 8 : 4
, 'int8': 1
, 'int16': 2
, 'int32': 4
, 'int64': 8
, 'uint': (process.arch == 'x64') ? 8 : 4
, 'uint8': 1
, 'uint16': 2
, 'uint32': 4
, 'uint64': 8
, 'float': (process.arch == 'x64') ? 8 : 4
, 'float32': 4
, 'float64': 8
, 'bool': 1
, 'pointer': (process.arch == 'x64') ? 8 : 4
}

/**
 * Maximum values, inclusive
 */

// NOTE: values larger than 32 bits are imprecise due to how JavaScript handles numbers
// to prevent this issue from affecting us, we limit int literals to maxof.int32

Type.maxof = {
  'int': Math.pow(2,(process.arch == 'x64') ? (64-1): (32-1))-1
, 'int8': Math.pow(2,8-1)-1
, 'int16': Math.pow(2,16-1)-1
, 'int32': Math.pow(2,32-1)-1
, 'int64': Math.pow(2,64-1)-1
, 'uint': Math.pow(2,(process.arch == 'x64') ? 64 : 32)-1
, 'uint8': Math.pow(2,8)-1
, 'uint16': Math.pow(2,16)-1
, 'uint32': Math.pow(2,32)-1
, 'uint64': Math.pow(2,64)-1
, 'float': Infinity
, 'float32': Infinity
, 'float64': Infinity
}

/**
 * Minimum values, inclusive
 */

Type.minof = {
  'int': -Math.pow(2,(process.arch == 'x64') ? (64-1): (32-1))
, 'int8': -Math.pow(2,8-1)
, 'int16': -Math.pow(2,16-1)
, 'int32': -Math.pow(2,32-1)
, 'int64': -Math.pow(2,64-1)
, 'uint': 0
, 'uint8': 0
, 'uint16': 0
, 'uint32': 0
, 'uint64': 0
, 'float': -Infinity
, 'float32': -Infinity
, 'float64': -Infinity
}

/**
 * Accepted operands in various operations
 */ 
Type.operand = {
  'logical': ['float', 'int', 'uint', 'bool', 'pointer', 'var']
, 'bitwise': ['int', 'uint', 'var']
, 'bitshift': ['int', 'uint', 'var']
, 'addition': ['float', 'int', 'uint', 'var']
, 'increment': ['float', 'int', 'uint', 'var', 'pointer']
, 'multiplication': ['float', 'int', 'uint', 'var']
, 'pointer arithmetic': ['int', 'uint', 'var']
, 'inheritance': ['var']
, 'application': ['var']
}

/**
 * Check if this type is equal to another one.
 * @param {Type} that  The other type to compare to
 */
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

/**
 * Get the size of this type in bytes
 */
Type.prototype.size = function() {
  var size = Type.sizeof[this.type]
  if (typeof size === 'undefined') {
    if (this.is('uint')) {
      size = Math.ceil(Math.log(this.value()+1)/Math.LN2) / 8
    } else if (this.is('int')) {
      size = (Math.ceil(Math.log(this.value()+(this.value() > 0) ? 1 : 0)/Math.LN2 + 1) / 8)
    } else if (this.is('float')) {
      return 4
    }
  }
  return size
}

/**
 * Get the maximum value representable by this type
 */
Type.prototype.max = function() {
  return Type.maxof[this.type] || Math.max(this.value(), 0)
}

/**
 * Get the minimum value representable by this type
 */
Type.prototype.min = function() {
  return Type.minof[this.type] || Math.min(this.value(), 0)
}

/**
 * Get the type family (e.g. int, int8, int32, int64 => int)
 */
Type.prototype.family = function() {
  return this.type.replace(/([0-9]+)|(\=.*$)/, '')
}

/**
 * Get the value of the type, for literal types
 */
Type.prototype.value = function() {
  var match = this.type.match(/\=(.*)$/)
  if (match) {
    return parseInt(match[1], 10)
  }
}

/**
 * Check if this type belongs to at least one of the families supplyied
 */
Type.prototype.is = function(/*...*/) {
  // Accept array argument
  if (arguments.length == 1 && arguments[0] instanceof Array) {
    return Type.prototype.is.apply(this, arguments[0])
  }
  var family = this.family()
  var n = arguments.length
  for (var i = 0; i < n; i++) {
    if (family == arguments[i]) {
      return true
    }
  }
  return false
}

/**
 * Checks if promoting (casting without data loss) is possible
 */
Type.prototype.canPromoteTo = function(to) {
  if (this.equals(to)) {
    return true;
  }
  
  // Any type can accept var
  if (this.is('var')) {
    return true
  }
  
  switch(to.family()) {
  case 'var':
    // var can accept any type
    return true
  case 'float':
    // float can accept int, uint and float of a smaller size
    if (this.is('int', 'uint', 'float')) {
      if (to.size() > this.size()) {
        return true
      }
    }
    break;
  case 'int':
    // int can accept int or uint
    if (this.is('int', 'uint')) {
      if (this.is('int') && to.size() >= this.size()) {
        return true
      }
      if (this.is('uint') && to.size() > this.size()) {
        return true
      }
      if (to.max() >= this.max() && to.min() <= this.min()) {
        return true
      }
    }
    break;
  case 'uint':
    // uint can accept uint
    if (this.is('uint')) {
      if (to.size() >= this.size()) {
        return true
      }
      if (to.max() >= this.max() && to.min() <= this.min()) {
        return true
      }
    }
    break;
  case 'function':
    // A function can only accept another function if it has the same number of arguments,
    if (this.is('function') && (this.subtypes.length == to.subtypes.length)) {
      // A return type that can be promoted to the desired return type,
      if (this.subtypes[0].canPromoteTo(to.subtypes[0])) {
        // And arguments that are valid promotions of the desired argument types
        for (var i = 1; i < this.subtypes.length; i++) {
          // (Notice that this check is backwards when compared to the check above)
          if (!to.subtypes[i].canPromoteTo(this.subtypes[i])) {
            return false
          }
        }
        return true
      }
    }
  case 'pointer':
    // pointers can accept pointers
    if (this.is('pointer')) {
      if (this.subtypes[0].is('void')) {
        return true
      }
      if (to.subtypes[0].is('void')) {
        return true
      }
    }
  }
  return false
}

/**
 * Checks if casting to another type is possible
 */
Type.prototype.canCastTo = function(to) {
  if (this.equals(to)) {
    return true
  }
  if (this.is('var') || to.is('var')) {
    return true
  }
  if ((this.is('int', 'uint', 'float', 'bool')) &&
      (to.is('int', 'uint', 'float', 'bool'))) {
    return true
  }
  if (this.is('function') && to.is('function')) {
    return this.subtypes.length == to.subtypes.length
  }
  if (this.is('pointer') && to.is('pointer')) {
    return true
  }
  
  return false
}

/**
 * Convert a type to its string representation
 */
Type.prototype.toString = function() {
  if (this.type == 'pointer') {
    return this.subtypes[0].toString() + '*'
  } else if (this.type == 'function') {
    return this.subtypes[0].toString() + '(' + this.subtypes.slice(1).join(',') + ')'
  } else {
    return this.type
  }
}

/**
 * Check if a type is numeric
 */ 
Type.prototype.isNumeric = function() {
  return this.is('float', 'int', 'uint', 'var')
}

/**
 * Check if a type is integral
 */ 
Type.prototype.isIntegral = function() {
  return this.is('int', 'uint', 'var')
}

/**
 * Returns the result of the interaction between two types
 */
Type.interact = function(type1, type2) {
  if (type1.canPromoteTo(type2)) {
    return type2
  } else if (type2.canPromoteTo(type1)) {
    return type1
  }
}