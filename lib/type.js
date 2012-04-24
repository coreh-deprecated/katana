var Type = module.exports = function(type, subtypes) {
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