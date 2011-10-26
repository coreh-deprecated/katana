exports.Program = function(code) {
    this.code = code
    if (code) {
        this.type = code.type
    } else {
        this.type = 'void'
    }
}

exports.Parental = function(expr) {
    this.expression = expr
    this.type = expr.type
}

exports.Operation = function(which, op1, op2) {
    if (op1.type != op2.type) {
        throw new Error('Incompatible types');
    }
    
    this.which = which
    this.operand1 = op1
    this.operand2 = op2
    this.type = op1.type
}

exports.Declaration = function(type, identifiers) {
    this.type = type
    this.identifiers = identifiers
}

exports.Literal = function(value, type) {
    this.value = value
    this.type = type
}

exports.Code = function(expression) {
    this.expressions = [expression]
    this.type = expression.type
}

exports.Code.prototype.push = function (expression) {
    this.expressions.push(expression)
    this.type = expression.type
}

exports.Block = function(code) {
    this.code = code
    this.type = code.type
}

exports.If = function(condition, block, elseBlock) {
    this.condition = condition
    this.block = block
    this.elseBlock = elseBlock
    
    if (this.elseBlock && this.elseBlock.type == this.block.type) {
        this.type = this.block.type
    } else {
        this.type = 'void'
    }
}

exports.Variable = function(name) {
    this.name = name
    this.type = 'int'
}

exports.Assignment = function(assignable, value) {
    if (assignable.type != value.type) {
        throw new Error('Incompatible types')
    }
    this.assignable = assignable
    this.value = value
}