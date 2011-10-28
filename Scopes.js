var ScopeStack = exports = module.exports = function() {
    this.scope = new Scope()
}

ScopeStack.prototype.push = function() {
    var oldScope = this.scope;
    this.scope = new Scope(oldScope)
}

ScopeStack.prototype.pop = function() {
    if (this.scope.parent) {
        this.scope = this.scope.parent
    } else {
        throw new Error('Trying to pop root scope')
    }
}

ScopeStack.prototype.current = function() {
    return this.scope
}

var Scope = exports.Scope = function(parent) {
    this.parent = parent
    this.variables = {}
}

Scope.prototype.put = function(identifier, type) {
    this.variables[identifier] = type
}

Scope.prototype.get = function(identifier) {
    return this.variables[identifier] || (this.parent ? this.parent.get(identifier) : null)
}

Scope.prototype.shallowGet = function(identifier) {
    return this.variables[identifier]
}