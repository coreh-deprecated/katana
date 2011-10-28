exports.Program = function(yy, code) {
    this.scope = yy.scopes.current()
    this.code = code
    if (code) {
        this.type = code.type
    } else {
        this.type = 'void'
    }
}

exports.Parental = function(yy, expr) {
    this.scope = yy.scopes.current()
    this.expression = expr
    this.type = expr.type
}

exports.Operation = function(yy, which, op1, op2) {
    if (op1.type != op2.type) {
        throw new Error('Incompatible types');
    }
    
    this.scope = yy.scopes.current()
    this.which = which
    this.operand1 = op1
    this.operand2 = op2
    this.type = op1.type
}

exports.Declaration = function(yy, type, identifiers) {
    this.scope = yy.scopes.current()
    this.type = type
    this.identifiers = identifiers
    for (var i = 0; i < identifiers.length; i++) {
        if (this.scope.shallowGet(identifiers[i])) {
            throw new Error('Variable already declared on current scope')
        }
        this.scope.put(identifiers[i], type)
    }
}

exports.Literal = function(yy, value, type) {
    this.scope = yy.scopes.current()
    this.value = value
    this.type = type
}

exports.Code = function(yy, expression) {
    this.scope = yy.scopes.current()
    this.expressions = [expression]
    this.type = expression.type
}

exports.Code.prototype.push = function(expression) {
    this.expressions.push(expression)
    this.type = expression.type
}

exports.Block = function(yy, code) {
    this.scope = yy.scopes.current()
    this.code = code
    this.type = code.type
}

exports.If = function(yy, condition, block, elseBlock) {
    this.scope = yy.scopes.current()
    this.condition = condition
    this.block = block
    this.elseBlock = elseBlock
    
    if (this.elseBlock && this.elseBlock.type == this.block.type) {
        this.type = this.block.type
    } else {
        this.type = 'void'
    }
}

exports.Variable = function(yy, name) {
    this.scope = yy.scopes.current()
    this.name = name
    this.type = yy.scopes.current().get(name)
}

exports.Assignment = function(yy, assignable, value) {    
    if (assignable.type != value.type) {
        throw new Error('Incompatible types')
    }
    
    this.scope = yy.scopes.current()
    this.assignable = assignable
    this.value = value
}