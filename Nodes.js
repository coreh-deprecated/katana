var i = 0;

exports.Program = function(code) {
    this.code = code
}

exports.Program.prototype.generate = function() {
    var tmp = this.code.generate()
    var code = 'int main(int argc, char**argv) {\n' + tmp.code;
    
    if (tmp.type == 'int') {
        code += '\treturn ' + tmp.reference + ';\n'
    } else {
        code += '\treturn 0;\n'
    }
    
    code += '}'
    return code;
}

exports.Operation = function(which, op1, op2) {
    this.which = which
    this.op1 = op1
    this.op2 = op2
}

exports.Operation.prototype.generate = function() {
    var tmp1 = this.op1.generate()
    var tmp2 = this.op2.generate()
    if (tmp1.type != tmp2.type) {
        throw new Error('Incompatible types');
    }
    return {
        code:
            tmp1.code +
            tmp2.code + 
            '\t' + tmp1.type + ' _v' + (i) + ' = ' + tmp1.reference + ' ' + this.which + ' ' + tmp2.reference + ';\n',
        reference: '_v'+i++,
        type: tmp1.type
    }
}

exports.Literal = function(value, type) {
    this.value = value
    this.type = type
} 

exports.Literal.prototype.generate = function() {
    return {
        code: '',
        reference: this.value,
        type: this.type
    }
}

exports.Code = function(expression) {
    this.expressions = [expression]
}

exports.Code.prototype.push = function (expression) {
    this.expressions.push(expression)
}

exports.Code.prototype.generate = function () {
    var code = ''
    var reference = ''
    var type = 'void'
    this.expressions.forEach(function(exp){
        var tmp = exp.generate()
        reference = tmp.reference
        type = tmp.type
        code += tmp.code
    })
    return {
        code: code,
        type: type,
        reference: reference
    }
}

exports.Block = function(code) {
    this.code = code
}

exports.Block.prototype.generate = function() {
    var tmp = this.code.generate()
    return {
        code: '\t{\n' + tmp.code + '\t}\n',
        reference: tmp.reference,
        type: tmp.type
    }
}