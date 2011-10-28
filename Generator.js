var uniqueCount = 0
var uniqueName = function(scope, what) {
    var name
    do {
        name = '_' + what + (uniqueCount++)
    } while (scope.get(name))
    return name
}

var cKeywords = [
    'auto',
    'double',
    'int',
    'struct',
    'break',
    'else',
    'long',
    'switch',
    'case',
    'enum',
    'register',
    'typedef',
    'char',
    'extern',
    'return',
    'union',
    'const',
    'float',
    'short',
    'unsigned',
    'continue',
    'for',
    'signed',
    'void',
    'default',
    'goto',
    'sizeof',
    'volatile',
    'do',
    'if',
    'static',
    'while'
]

var adaptIdentifier = function(scope, identifier) {
    if (cKeywords.indexOf(identifier) != -1) {
        do {
            identifier = '_' + identifier;
        } while (scope.get(identifier))
    }
    return identifier
}

exports = module.exports = require('./Nodes')

exports.Program.prototype.generate = function() {

    var code = 'int main(int argc, char**argv) {';

    if (this.code) {
        if (this.code.type == 'int') {
            var tmp = this.code.generate()
        } else {
            var tmp = this.code.generate({ suppressName: true })
        }
    
        var declarationsByType = {}
    
        for (var variable in tmp.declare) {
            var type = tmp.declare[variable].type
            if (!declarationsByType[type]) {
                declarationsByType[type] = []
            }
            declarationsByType[type].push(variable)
        }
    
        for (var type in declarationsByType) {
            code += type + ' ' + declarationsByType[type] + ';'
        }

        code += tmp.block;
    
        if (tmp.type == 'int') {
            code += 'return ' + (tmp.inline || tmp.name) + ';'
        } else {
            if (tmp.inline) {
                code += tmp.inline + ';'
            }
            code += 'return 0;'
        }
    } else {
        code += 'return 0;'
    }
    
    code += '}'
    return code;
}

exports.Parental.prototype.generate = function() {
    
    var tmp = this.expression.generate()
    var inline = ''
    var name = ''
    
    if (tmp.name) {
        name = tmp1.name
    } else {
        inline = '(' + tmp.inline + ')'
    }
            
    return {
        inline: inline,
        block: tmp.block,
        name: name,
        type: tmp.type,
        declare: tmp.declare
    }
}

exports.Operation.prototype.generate = function() {
    
    var tmp1 = this.operand1.generate()
    var tmp2 = this.operand2.generate()
    var declare = {}

    for (var variable in tmp1.declare) {
        declare[variable] = tmp1.declare[variable]
    }

    for (var variable in tmp2.declare) {
        declare[variable] = tmp2.declare[variable]
    }
            
    return {
        inline: (tmp1.inline || tmp1.name) + this.which + (tmp2.inline || tmp2.name),
        block: tmp1.block + tmp2.block,
        name: '',
        type: tmp1.type,
        declare: declare
    }
}

exports.Declaration.prototype.generate = function() {
    var declare = {}
    for (var i = 0; i < this.identifiers.length; i++) {
        var identifier = adaptIdentifier(this.scope, this.identifiers[i])
        declare[identifier] = { type: this.type }
    }
    return {
        inline: '',
        block: '',
        name: '',
        type: 'void',
        declare: declare
    }
}

exports.Literal.prototype.generate = function() {
    var inline
    switch (this.type) {
        case 'float':
            inline = this.value.toString()
            if (!inline.match(/\./)) {
                inline += '.0f'
            } else {
                inline += 'f'
            }
            break
        case 'int':
            inline = this.value.toString()
            break
        case 'string':
            inline = '"' + this.value + '"'
            break
    }
    return {
        inline: inline,
        block: '',
        name: '',
        type: this.type,
        declare: {}
    }
}

exports.Code.prototype.generate = function (options) {
    options = options || {}
    
    var block = ''
    var name = ''
    var type = 'void'
    var inline = ''
    var declare = {}

    for (var i = 0; i < this.expressions.length; i++) {
        if (i == this.expressions.length - 1) {
            var tmp = this.expressions[i].generate({ forceName: options.forceName, suppressName: options.suppressName })
        } else {
            var tmp = this.expressions[i].generate()
        }
        
        for (var variable in tmp.declare) {
            declare[variable] = tmp.declare[variable]
        }
        
        if (i == this.expressions.length - 1) {
            type = tmp.type
            block += tmp.block
            
            if (tmp.name) {
                name = tmp.name
            } else if (tmp.inline) {
                inline = tmp.inline
            }
        } else {
            block += tmp.block
            if (tmp.inline) {
                block += tmp.inline + ';'
            }
        }
    }

    return {
        inline: inline,
        block: block,
        name: name,
        type: type,
        declare: declare
    }
}

exports.Block.prototype.generate = function(options) {
    options = options || {}
    var tmp = this.code.generate({ forceName: options.forceName })

    var name = ''
    var block = tmp.block
    var declare = tmp.declare
    
    if (tmp.name) {
        if (options.forceName && tmp.name != options.forceName) {
            block += options.forceName + '=' + tmp.name + ';'
        } else {
            name = tmp.name
        }
    } else if (tmp.inline) {
        if (options.suppressName) {
            block += tmp.inline + ';'
        } else {
            if (options.forceName) {
                name = options.forceName
            } else {
                name = uniqueName(this.scope, 'v')
            }
            block += name + '=' + tmp.inline + ';'
            declare[name] = { type: tmp.type }
        }
    }
    
    return {
        block: ' { ' + block + ' }\n',
        name: name,
        inline: '',
        type: tmp.type,
        declare: declare
    }
}

exports.If.prototype.generate = function(options) {
    options = options || {}
    
    var childrenShouldSupressName = options.suppressName
    var childrenForceName = options.forceName || ''
    
    if (this.type == 'void') {
        childrenShouldSupressName = true;
    } else {
        if (!childrenForceName) {
            childrenForceName = uniqueName(this.scope, 'v')
        }
    }
    
    var generatedCondition = this.condition.generate()
    var generatedBlock = this.block.generate({
        suppressName: childrenShouldSupressName,
        forceName: childrenForceName
    })
    
    var declare = {}
    
    for (var variable in generatedCondition.declare) {
        declare[variable] = generatedCondition.declare[variable]
    }

    for (var variable in generatedBlock.declare) {
        declare[variable] = generatedBlock.declare[variable]
    }
    
    if (this.elseBlock) {
        var generatedElseBlock = this.elseBlock.generate({
            suppressName: childrenShouldSupressName,
            forceName: childrenForceName
        })
        
        for (var variable in generatedElseBlock.declare) {
            declare[variable] = generatedElseBlock.declare[variable]
        }
    }
    
    var block = generatedCondition.block
    block += 'if (' + (generatedCondition.inline || generatedCondition.name) + ')'
    block += generatedBlock.block
    if (this.elseBlock) {
        block += 'else' 
        block += generatedElseBlock.block
    }    

    return {
        block: block,
        name: childrenForceName,
        inline: '',
        type: this.type,
        declare: declare
    }
}

exports.Variable.prototype.generate = function() {
    return {
        block: '',
        inline: '',
        name: adaptIdentifier(this.scope, this.name),
        type: this.type,
        declare: {}   
    }
}

exports.Assignment.prototype.generate = function() {
    var generatedAssignable = this.assignable.generate()
    var generatedValue = this.value.generate()
    
    var declare = {}
    
    for (var variable in generatedAssignable.declare) {
        declare[variable] = generatedAssignable.declare[variable]
    }

    for (var variable in generatedValue.declare) {
        declare[variable] = generatedValue.declare[variable]
    }
    
    
    return {
        block: generatedAssignable.block + generatedValue.block,
        inline: (generatedAssignable.inline || generatedAssignable.name) + '=' + (generatedValue.inline || generatedValue.name),
        name: generatedAssignable.name,
        type: generatedAssignable.type,
        declare: declare
    }
}