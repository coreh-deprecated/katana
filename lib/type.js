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
  return Type.sizeof[this.type]
}

/**
 * Get the type family (e.g. int, int8, int32, int64 => int)
 */
Type.prototype.family = function() {
  return this.type.replace(/[0-9]+/, '')
}

/**
 * Check if this type belongs to at least one of the families supplyied
 */
Type.prototype.is = function(/*...*/) {
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
    // int can accept int and uint of a smaller size
    if (this.is('int', 'uint')) {
      if (to.size() > this.size()) {
        return true
      }
    }
    break;
  case 'uint':
    // uint can accept uint of a smaller size
    if (this.is('uint')) {
      if (to.size() > this.size()) {
        return true
      }
    }
    break;
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
 * Check if a type can be used in logical expressions
 */ 
Type.prototype.isLogical = function() {
  return this.is('float', 'int', 'uint', 'bool', 'pointer', 'var')
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
  }
  if (type2.canPromoteTo(type1)) {
    return type1
  }
}