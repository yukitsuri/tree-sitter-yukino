module.exports = grammar({
  name: 'yukino',

  extras: $ => [
    /\s/,
    $.line_comment,
    $.block_comment,
  ],

  conflicts: $ => [
    [$.struct_expression, $._expression],
    [$.return_statement],
    [$.recur_statement],
    [$.break_statement],
    [$.continue_statement],
    [$.user_type],
    [$.function_type],
    [$.if_statement],
    [$.function_declaration],
    [$.cfun_declaration],
    [$.import_statement],
    [$.import_path],
    [$.import_pattern],
    [$.import_segment],
    [$._loop_label, $.while_statement],
    [$._loop_label, $._expression],
    [$.expression_statement, $.map_entry],
    [$.variable_declaration],
    [$.c_attribute_item, $.lambda_expression],
  ],

  word: $ => $.identifier,

  rules: {
    // Source file contains module attributes and statements.
    source_file: $ => repeat(choice(
      $.module_attribute,
      $._statement
    )),

    _statement: $ => choice(
      $.function_declaration,
      $.cfun_declaration,
      $.externc_block,
      $.class_declaration,
      $.struct_declaration,
      $.interface_declaration,
      $.enum_declaration,
      $.macro_declaration,
      $.alias_declaration,
      $.type_alias_declaration,
      $.import_statement,
      $.variable_declaration,
      $.rewrite_statement,
      $.assignment_statement,
      $.break_statement,
      $.continue_statement,
      $.return_statement,
      $.recur_statement,
      $.defer_statement,
      $.space_statement,
      $.expression_statement,
    ),

    expression_statement: $ => seq($._expression, optional(';')),

    // Single-line and multi-line comments.
    line_comment: $ => token(seq('//', /.*/)),
    block_comment: $ => token(seq('/*', /[^*]*\*+([^/*][^*]*\*+)*/, '/')),
    comment: $ => choice($.line_comment, $.block_comment),

    // Module-level attributes with optional negation prefix.
    module_attribute: $ => choice(
      seq('#![', commaSep1($.attribute_item), optional(','), ']'),
      seq('!#[', commaSep1($.attribute_item), optional(','), ']')
    ),

    // Item-level compiler and C-ABI attributes.
    attribute: $ => choice(
      seq('|', commaSep1($.c_attribute_item), optional(','), '|'),
      seq('#[', commaSep1($.attribute_item), optional(','), ']')
    ),

    // C-ABI attribute item syntax.
    c_attribute_item: $ => seq(
      field('name', $.identifier),
      optional(choice(
        seq('=', choice($.identifier, $.string, $.number)),
        seq('(', commaSep(choice($.string, $.number, $.identifier)), ')')
      ))
    ),

    // Compiler attribute item with optional negation, scoped path, and arguments.
    attribute_item: $ => seq(
      optional('!'),
      field('name', choice($.identifier, $.scoped_identifier)),
      optional(choice(
        seq('=', field('value', $._expression)),
        seq('(', commaSep(choice($.attribute_named_arg, $._expression)), optional(','), ')')
      ))
    ),

    // Named argument inside an attribute.
    attribute_named_arg: $ => seq(
      field('name', $.identifier),
      '=',
      field('value', $._expression)
    ),

    // Function declaration with attributes, type parameters, and body.
    function_declaration: $ => seq(
      repeat($.attribute),
      optional('public'),
      optional('static'),
      'fun',
      field('name', choice($.identifier, alias('get', $.identifier), alias('set', $.identifier))),
      optional($.type_parameters),
      field('parameters', $.parameters),
      optional(seq('->', field('return_type', $._type))),
      optional(field('body', $.block)),
      optional(';')
    ),

    // Foreign C function declaration.
    cfun_declaration: $ => seq(
      repeat($.attribute),
      optional('public'),
      'cfun',
      field('name', $.identifier),
      field('parameters', $.parameters),
      optional(seq('->', field('return_type', $._type))),
      optional(seq('as', field('symbol', $.identifier))),
      optional(field('body', $.block)),
      optional(';')
    ),

    // External C declaration block.
    externc_block: $ => seq(
      repeat($.attribute),
      optional('public'),
      'externc',
      optional($.string),
      '{',
      repeat(choice(
        $.cfun_declaration,
        $.struct_declaration,
        ';'
      )),
      '}'
    ),

    // Class declaration with inheritance and interfaces.
    class_declaration: $ => seq(
      repeat($.attribute),
      optional('public'),
      optional('locked'),
      'class',
      field('name', $.identifier),
      optional($.type_parameters),
      optional(field('heritage', $.class_heritage)),
      field('body', $.class_body)
    ),

    // Class inheritance and implemented interfaces.
    class_heritage: $ => choice(
      seq('extends', $.user_type, optional(seq('with', commaSep1($.user_type)))),
      seq('with', commaSep1($.user_type))
    ),

    class_body: $ => seq(
      '{',
      repeat(choice(
        $.field_declaration,
        $.method_declaration,
        $.property_declaration,
        $.operator_declaration,
      )),
      '}'
    ),

    // Struct or C-compatible struct declaration.
    struct_declaration: $ => seq(
      repeat($.attribute),
      optional('public'),
      choice('struct', 'cstruct'),
      field('name', $.identifier),
      optional($.type_parameters),
      field('body', $.struct_body)
    ),

    struct_body: $ => seq(
      '{',
      repeat(choice(
        $.field_declaration,
        $.method_declaration,
        $.operator_declaration,
      )),
      '}'
    ),

    // Interface definition.
    interface_declaration: $ => seq(
      repeat($.attribute),
      optional('public'),
      'interface',
      field('name', $.identifier),
      optional($.type_parameters),
      field('body', $.interface_body)
    ),

    interface_body: $ => seq(
      '{',
      repeat($.method_signature),
      '}'
    ),

    // Method signature inside an interface.
    method_signature: $ => seq(
      repeat($.attribute),
      optional('public'),
      'fun',
      field('name', choice($.identifier, alias('get', $.identifier), alias('set', $.identifier))),
      optional($.type_parameters),
      field('parameters', $.parameters),
      optional(seq('->', field('return_type', $._type))),
      optional(field('body', $.block)),
      optional(';')
    ),

    // Enum declaration with variants and members.
    enum_declaration: $ => seq(
      repeat($.attribute),
      optional('public'),
      'enum',
      field('name', $.identifier),
      optional($.type_parameters),
      optional(seq(':', field('tag_type', $._type))),
      field('body', $.enum_body)
    ),

    enum_body: $ => seq(
      '{',
      commaSep($.enum_variant),
      optional(','),
      repeat(choice($.method_declaration, $.field_declaration)),
      '}'
    ),

    // Enum variant with optional payload or value.
    enum_variant: $ => seq(
      repeat($.attribute),
      field('name', $.identifier),
      optional(field('parameters', $.enum_variant_parameters)),
      optional(seq('=', $._expression))
    ),

    // Enum variant payload parameters
    enum_variant_parameters: $ => seq(
      '(',
      commaSep($.enum_variant_parameter),
      optional(','),
      ')'
    ),

    // Enum variant parameter supporting named fields or positional types
    enum_variant_parameter: $ => seq(
      repeat($.attribute),
      choice(
        seq(
          optional('...'),
          optional(choice(seq('ref', '~'), 'ref', '~')),
          field('name', $.identifier),
          seq(':', field('type', $._type)),
          optional(seq('=', field('default_value', $._expression)))
        ),
        $._type
      )
    ),

    // Macro declaration with pattern body.
    macro_declaration: $ => seq(
      repeat($.attribute),
      optional('public'),
      choice('define', 'macro'),
      field('name', $.identifier),
      optional('!'),
      field('parameters', $.parameters),
      choice(
        seq(choice('=>', '='), $._expression, optional(';')),
        field('body', $.block)
      )
    ),

    // Symbol alias declaration.
    alias_declaration: $ => seq(
      repeat($.attribute),
      optional('public'),
      'alias',
      $._alias_target,
      'as',
      field('name', $.identifier),
      optional(';')
    ),

    // Type alias declaration.
    type_alias_declaration: $ => seq(
      repeat($.attribute),
      optional('public'),
      'type',
      field('name', $.identifier),
      optional($.type_parameters),
      '=',
      field('target', $._type),
      optional(';')
    ),

    // Alias target path.
    _alias_target: $ => seq(
      $.identifier,
      repeat(seq('::', $.identifier)),
      optional(seq('#', $.identifier))
    ),

    // Import module path.
    import_path: $ => seq(
      choice(
        seq(field('prefix', $.relative_prefix), optional(prec.dynamic(1, $.import_segment))),
        field('prefix', $.identifier)
      ),
      repeat(seq('.', $.import_segment))
    ),

    // Relative prefix with optional directory forcing bang.
    relative_prefix: $ => token(seq(repeat1(choice('.', '..', '...')), optional('!'))),

    // Import path segment with optional folder resolution bang.
    import_segment: $ => choice(
      prec.dynamic(1, seq($.import_pattern, '!')),
      $.import_pattern
    ),

    // Import pattern for symbols.
    import_pattern: $ => choice(
      prec.dynamic(1, seq('*', $.identifier)),
      prec.dynamic(1, seq($.identifier, '*')),
      '*',
      $.identifier
    ),

    // Import statement with optional symbol clause.
    import_statement: $ => seq(
      repeat($.attribute),
      optional('public'),
      'load',
      field('module', $.import_path),
      optional(seq(':', field('symbols', $.import_symbols_clause))),
      optional(';')
    ),

    // Import symbols clause supporting multiline items and optional aliases.
    import_symbols_clause: $ => seq(
      commaSep1($.import_pattern),
      optional(seq('as', commaSep1($.identifier)))
    ),

    // Field declaration with attributes and optional default value.
    field_declaration: $ => seq(
      repeat($.attribute),
      optional('public'),
      optional(choice('set', 'static')),
      field('name', $.identifier),
      ':',
      field('type', $._type),
      optional(seq('=', $._expression)),
      optional(choice(',', ';'))
    ),

    // Method declaration inside classes and structs.
    method_declaration: $ => seq(
      repeat($.attribute),
      optional('public'),
      optional('static'),
      'fun',
      field('name', choice($.identifier, alias('get', $.identifier), alias('set', $.identifier))),
      optional($.type_parameters),
      field('parameters', $.parameters),
      optional(seq('->', field('return_type', $._type))),
      optional(field('body', $.block)),
      optional(';')
    ),

    // Direct or compound assignment statement
    assignment_statement: $ => seq(
      field('target', $._expression),
      field('operator', choice('=', '+=', '-=', '*=', '/=', '%=', '**=', '&=', '|=', '^=', '<<=', '>>=')),
      field('value', $._expression),
      optional(';')
    ),

    // Property getter or setter declaration.
    property_declaration: $ => seq(
      repeat($.attribute),
      optional('public'),
      optional('static'),
      optional('fun'),
      choice(
        seq(
          'get',
          field('name', $.identifier),
          optional(seq('(', ')')),
          choice(':', '->'),
          field('return_type', $._type),
          field('body', $.block)
        ),
        seq(
          'set',
          field('name', $.identifier),
          field('parameters', $.parameters),
          optional(seq(choice(':', '->'), $._type)),
          field('body', $.block)
        )
      )
    ),

    // Operator overload declaration.
    operator_declaration: $ => seq(
      repeat($.attribute),
      optional('public'),
      choice(
        'operator',
        seq('operator', 'fun'),
        seq('fun', 'operator')
      ),
      field('name', $.operator_symbol),
      field('parameters', $.parameters),
      optional(seq('->', field('return_type', $._type))),
      field('body', $.block)
    ),

    // Overloadable operator symbols.
    operator_symbol: $ => choice(
      '+', '-', '*', '/', '%', '**',
      '==', '!=', '<', '<=', '>', '>=',
      '&', '|', '^', '~', '!', '<<', '>>',
      '[]', '[]='
    ),

    // Variable declaration via set or static.
    variable_declaration: $ => seq(
      repeat($.attribute),
      optional('public'),
      choice('set', 'static'),
      field('name', $._binding_pattern),
      optional(seq(':', field('type', $._type))),
      optional(seq('=', field('value', $._expression))),
      optional(';')
    ),

    // Variable mutation via rewrite.
    rewrite_statement: $ => seq(
      'rewrite',
      field('target', $._expression),
      field('operator', choice('=', '+=', '-=', '*=', '/=', '%=', '**=', '&=', '|=', '^=', '<<=', '>>=')),
      field('value', $._expression),
      optional(';')
    ),

    // Conditional branching if statement.
    if_statement: $ => prec.right(0, seq(
      'if',
      field('condition', $._expression),
      field('consequence', $.block),
      repeat($.elif_clause),
      optional($.else_clause)
    )),

    elif_clause: $ => seq(
      'elif',
      field('condition', $._expression),
      field('consequence', $.block)
    ),

    else_clause: $ => seq(
      'else',
      field('alternative', $.block)
    ),

    // Loop label prefix or suffix
    _loop_label: $ => choice(
      seq(field('label', $.identifier), ':'),
      seq(':', field('label', $.identifier))
    ),

    // While loop statement.
    while_statement: $ => seq(
      optional($._loop_label),
      'while',
      optional(seq(field('label', $.identifier), ':')),
      field('condition', $._expression),
      field('body', $.block)
    ),

    // For loop statement.
    for_statement: $ => seq(
      optional($._loop_label),
      'for',
      optional(seq(field('label', $.identifier), ':')),
      field('item', $._binding_pattern),
      optional(seq(',', field('index', $.identifier))),
      'in',
      field('iterable', $._expression),
      field('body', $.block)
    ),

    // Destructuring binding patterns
    _binding_pattern: $ => choice(
      $.identifier,
      '_',
      $.tuple_pattern,
      $.array_pattern,
      $.map_pattern,
    ),

    tuple_pattern: $ => seq(
      '(',
      commaSep1(choice(seq(optional('...'), $._binding_pattern), '...')),
      optional(','),
      ')'
    ),

    // Array destructuring pattern
    array_pattern: $ => seq(
      '[',
      commaSep(choice(seq(optional('...'), $._binding_pattern), '...')),
      optional(','),
      ']'
    ),

    // Map and struct destructuring pattern
    map_pattern: $ => seq(
      '{',
      commaSep($.map_pattern_field),
      optional(','),
      '}'
    ),

    // Field entry in map destructuring
    map_pattern_field: $ => seq(
      field('field', $.identifier),
      optional(seq(':', field('alias', $._binding_pattern))),
      optional(seq('=', field('default_value', $._expression)))
    ),

    // Infinite loop statement.
    loop_statement: $ => seq(
      optional($._loop_label),
      'loop',
      optional(seq(field('label', $.identifier), ':')),
      field('body', $.block)
    ),

    // Break statement.
    break_statement: $ => seq(
      'break',
      optional(seq(optional(':'), field('label', $.identifier))),
      optional(';')
    ),

    // Continue statement.
    continue_statement: $ => seq(
      'continue',
      optional(seq(optional(':'), field('label', $.identifier))),
      optional(';')
    ),

    // Pattern matching switch statement.
    switch_statement: $ => seq(
      'switch',
      field('value', $._expression),
      field('body', $.switch_body)
    ),

    switch_body: $ => seq(
      '{',
      repeat(seq($.switch_arm, optional(','))),
      '}'
    ),

    switch_arm: $ => seq(
      field('pattern', $._pattern),
      optional(seq('if', field('guard', $._expression))),
      '->',
      field('body', $._expression)
    ),

    _pattern: $ => seq(
      $._pattern_alt,
      repeat(seq('|', $._pattern_single))
    ),

    _pattern_alt: $ => choice(
      prec(1, seq($._pattern_single, choice('..', '..='), $._pattern_single)),
      $._pattern_single
    ),

    _pattern_single: $ => choice(
      'else',
      $.number,
      $.string,
      $.char,
      $.true,
      $.false,
      $.null,
      $.pattern_tuple,
      $.variant_pattern,
      $.struct_pattern,
      $.identifier,
      '_'
    ),

    pattern_tuple: $ => seq('(', commaSep($._pattern), optional(','), ')'),

    variant_pattern: $ => choice(
      seq(
        field('enum', $.identifier), '::', field('variant', $.identifier),
        optional($.variant_payload)
      ),
      seq(field('variant', $.identifier), $.variant_payload)
    ),

    variant_payload: $ => seq('(', commaSep($._pattern), optional(','), ')'),

    // Struct pattern for pattern matching.
    struct_pattern: $ => seq(
      field('name', choice($.identifier, $.scoped_identifier)),
      '{',
      optional(seq(
        $.struct_pattern_field,
        repeat(seq(optional(choice(',', ';')), $.struct_pattern_field)),
        optional(choice(',', ';'))
      )),
      '}'
    ),

    struct_pattern_field: $ => seq(
      field('name', $.identifier),
      optional(seq(':', field('value', $._pattern)))
    ),

    // Return statement.
    return_statement: $ => seq(
      'return',
      optional($._expression),
      optional(';')
    ),

    // Tail recursion statement.
    recur_statement: $ => seq(
      'recur',
      optional($.arguments),
      optional(';')
    ),

    // Structured exception handling statement.
    sus_statement: $ => seq(
      'sus',
      field('body', $.block),
      repeat(seq(
        'catch',
        optional(choice(
          seq(field('error', $.identifier), ':', field('error_type', $._type)),
          field('error_type', $._type)
        )),
        field('handler', $.block)
      )),
      optional(seq(
        'finally',
        field('finalizer', $.block)
      ))
    ),

    // Defer statement.
    defer_statement: $ => seq(
      'defer',
      field('body', $.block)
    ),

    // Yield execution statement.
    space_statement: $ => seq(
      'space',
      optional(';')
    ),

    // Code block enclosed in braces.
    block: $ => seq(
      '{',
      repeat($._statement),
      '}'
    ),

    parameters: $ => seq(
      '(',
      commaSep($.parameter),
      optional(','),
      ')'
    ),

    // Parameter with optional attributes, modifiers, type annotation, and default value.
    parameter: $ => seq(
      repeat($.attribute),
      optional('...'),
      optional(choice(seq('ref', '~'), 'ref', '~')),
      field('name', $.identifier),
      optional(seq(':', field('type', $._type))),
      optional(seq('=', field('default_value', $._expression)))
    ),

    type_parameters: $ => seq(
      '<',
      commaSep1($.identifier),
      optional(','),
      '>'
    ),

    // Positional or named argument in call or macro invocation.
    _argument: $ => choice(
      $.named_argument,
      $._expression
    ),

    // Named argument key-value pair.
    named_argument: $ => seq(
      field('name', $.identifier),
      '=',
      field('value', $._expression)
    ),

    // Argument list enclosed in parentheses.
    arguments: $ => seq(
      '(',
      optional(seq(
        $._argument,
        repeat(seq(',', $._argument)),
        optional(',')
      )),
      ')'
    ),

    _expression: $ => choice(
      $.binary_expression,
      $.unary_expression,
      $.spread_expression,
      $.cast_expression,
      $.call_expression,
      $.macro_call_expression,
      $.lambda_expression,
      $.arrow_function,
      $.field_expression,
      $.scoped_identifier,
      $.index_expression,
      $.init_expression,
      choice($.identifier, alias('cast', $.identifier)),
      $.number,
      $.string,
      $.char,
      $.true,
      $.false,
      $.null,
      $.this,
      $.super,
      $.parenthesized_expression,
      $.array_expression,
      $.map_expression,
      $.struct_expression,
      prec.dynamic(1, $.block),
      $.region_expression,
      $.ternary_expression,
      $.is_expression,
      $.if_statement,
      $.switch_statement,
      $.while_statement,
      $.for_statement,
      $.loop_statement,
      $.sus_statement,
    ),

    // Explicit type cast expression
    cast_expression: $ => prec(17, seq(
      field('cast', choice('cast', seq(choice($.identifier, $.scoped_identifier), '::', 'cast'))),
      '<',
      field('type', $._type),
      optional(','),
      '>',
      '(',
      field('value', $._expression),
      ')'
    )),

    // Spread argument or expression
    spread_expression: $ => prec(15, seq(
      '...',
      field('argument', $._expression)
    )),

    is_expression: $ => prec.left(7, seq(
      field('left', $._expression),
      'is',
      field('right', $._type)
    )),

    ternary_expression: $ => prec.right(0, seq(
      field('condition', $._expression),
      '?',
      field('consequence', $._expression),
      ':',
      field('alternative', $._expression)
    )),

    scoped_identifier: $ => prec(17, seq(
      choice($.scoped_identifier, $.primitive_type, $.identifier),
      '::',
      $.identifier
    )),

    region_expression: $ => seq('region', field('body', $.block)),

    parenthesized_expression: $ => seq('(', commaSep1($._expression), ')'),

    array_expression: $ => seq(
      '[',
      optional(seq(
        $._expression,
        repeat(seq(',', $._expression)),
        optional(',')
      )),
      ']'
    ),

    map_expression: $ => seq(
      '{',
      commaSep1($.map_entry),
      optional(','),
      '}'
    ),

    map_entry: $ => seq(
      field('key', $._expression),
      ':',
      field('value', $._expression)
    ),

    // Lambda expression with parameters and expression or block body.
    lambda_expression: $ => choice(
      prec.right(0, seq(
        'fun',
        optional(field('type_parameters', $.type_parameters)),
        field('parameters', $.parameters),
        optional(seq('->', field('return_type', $._type))),
        '=>',
        field('body', $._expression)
      )),
      prec(1, seq(
        'fun',
        optional(field('type_parameters', $.type_parameters)),
        field('parameters', $.parameters),
        optional(seq('->', field('return_type', $._type))),
        field('body', $.block)
      )),
      prec.right(0, seq(
        '|',
        commaSep($.identifier),
        '|',
        field('body', $._expression)
      ))
    ),

    // Arrow function with identifier or parenthesized parameters.
    arrow_function: $ => prec.right(0, seq(
      field('parameters', choice(
        $.identifier,
        seq('(', ')'),
        $.parenthesized_expression
      )),
      '=>',
      field('body', $._expression)
    )),

    // Struct construction expression with optional field separators.
    struct_expression: $ => seq(
      field('name', choice($.identifier, $.scoped_identifier)),
      '{',
      optional(seq(
        $.struct_field_initializer,
        repeat(seq(optional(choice(',', ';')), $.struct_field_initializer)),
        optional(choice(',', ';'))
      )),
      '}'
    ),

    // Struct field initializer with optional attribute prefix.
    struct_field_initializer: $ => seq(
      repeat($.attribute),
      field('name', $.identifier),
      ':',
      field('value', $._expression)
    ),

    // Binary expressions with explicit operator precedences.
    binary_expression: $ => {
      const table = [
        [prec.left, 1, '|>'],
        [prec.left, 1, '||'],
        [prec.left, 2, '&&'],
        [prec.left, 3, '|'],
        [prec.left, 4, '^'],
        [prec.left, 5, '&'],
        [prec.left, 6, '=='],
        [prec.left, 6, '!='],
        [prec.left, 7, '<'],
        [prec.left, 7, '<='],
        [prec.left, 7, '>'],
        [prec.left, 7, '>='],
        [prec.left, 8, '..'],
        [prec.left, 8, '..='],
        [prec.left, 9, '<<'],
        [prec.left, 9, '>>'],
        [prec.left, 10, '+'],
        [prec.left, 10, '-'],
        [prec.left, 11, '*'],
        [prec.left, 11, '/'],
        [prec.left, 11, '%'],
        [prec.right, 12, '**'],
        [prec.left, 13, '??'],
      ];

      return choice(...table.map(([fn, p, op]) =>
        fn(p, seq(
          field('left', $._expression),
          field('operator', op),
          field('right', $._expression)
        ))
      ));
    },

    unary_expression: $ => choice(
      prec(14, seq(
        field('operator', choice('-', '!', '~', 'ref')),
        field('argument', $._expression)
      )),
      prec(15, seq(
        field('operator', seq('ref', '~')),
        field('argument', $._expression)
      )),
    ),

    call_expression: $ => prec(15, seq(
      field('function', choice($.identifier, $.field_expression, $.scoped_identifier, alias('cast', $.identifier))),
      field('arguments', $.arguments)
    )),

    macro_call_expression: $ => prec(15, seq(
      field('macro', choice($.identifier, $.scoped_identifier)),
      '!',
      field('arguments', choice(
        $.arguments,
        $.macro_brace_arguments,
        $.macro_bracket_arguments
      ))
    )),

    // Macro arguments enclosed in curly braces.
    macro_brace_arguments: $ => seq(
      '{',
      commaSep($._argument),
      optional(','),
      '}'
    ),

    // Macro arguments enclosed in square brackets.
    macro_bracket_arguments: $ => seq(
      '[',
      commaSep($._argument),
      optional(','),
      ']'
    ),

    field_expression: $ => prec(16, seq(
      field('argument', $._expression),
      choice('.', '?.'),
      field('field', choice($.identifier, $.integer)),
      optional(seq('::', field('method', $.identifier)))
    )),

    // Indexing or slicing access on an expression.
    index_expression: $ => prec(16, seq(
      field('argument', $._expression),
      '[',
      choice(
        field('index', $._expression),
        $.slice_range
      ),
      ']'
    )),

    // Slice range with open or closed bounds.
    slice_range: $ => choice(
      seq(field('start', $._expression), choice('..', '..=')),
      seq(choice('..', '..='), field('end', $._expression)),
      choice('..', '..='),
    ),

    // Class instantiation with optional type arguments and constructor parameters.
    init_expression: $ => prec(14, seq(
      'init',
      field('class', choice($.identifier, $.scoped_identifier)),
      optional(seq('<', commaSep1($._type), optional(','), '>')),
      field('arguments', $.arguments)
    )),

    _type: $ => choice(
      $.union_type,
      $.nullable_type,
      $._base_type,
    ),

    union_type: $ => prec.left(1, seq($._type, '|', $._type)),
    nullable_type: $ => prec(3, seq($._base_type, '?')),

    _base_type: $ => choice(
      $.primitive_type,
      $.slice_type,
      $.function_type,
      $.tuple_type,
      $.user_type,
      $.ref_type,
    ),

    // Reference type
    ref_type: $ => seq('ref', optional('~'), $._type),

    tuple_type: $ => seq('(', commaSep($._type), ')'),

    function_type: $ => seq(
      choice('fun', 'cfun'),
      '(',
      commaSep($._type),
      ')',
      optional(seq('->', $._type))
    ),

    primitive_type: $ => choice(
      'int8', 'int16', 'int32', 'int64',
      'uint8', 'uint16', 'uint32', 'uint64',
      'float32', 'float64', 'bool', 'char',
      'void', 'never', 'string',
      'c_char', 'c_int', 'c_size_t', 'c_void',
      'c_long', 'c_short', 'c_uint', 'usize', 'isize'
    ),

    // Slices and fixed-size array types.
    slice_type: $ => prec(17, seq($._type, '[', optional(choice($.integer, $.identifier)), ']')),

    // User-defined or library type with optional generic arguments.
    user_type: $ => seq(
      choice($.identifier, $.scoped_identifier),
      optional(seq('<', commaSep1($._type), optional(','), '>'))
    ),

    identifier: $ => /[a-zA-Z_][a-zA-Z0-9_]*/,

    number: $ => choice($.integer, $.float),
    integer: $ => token(seq(
      choice(
        /0x[0-9a-fA-F_]+/,
        /0b[01_]+/,
        /0o[0-7_]+/,
        /[0-9][0-9_]*/
      ),
      optional(choice('i8', 'i16', 'i32', 'i64', 'u8', 'u16', 'u32', 'u64'))
    )),

    // Floating point number with optional exponent.
    float: $ => token(seq(
      choice(
        seq(/[0-9][0-9_]*\.[0-9][0-9_]*/, optional(/[eE][+-]?[0-9][0-9_]*/)),
        seq(/[0-9][0-9_]*/, /[eE][+-]?[0-9][0-9_]*/)
      ),
      optional(choice('f32', 'f64'))
    )),

    // String literals with optional interpolation.
    string: $ => choice(
      seq('"', repeat(choice(
        $.string_content,
        $.escape_sequence,
        $.interpolation,
        '$'
      )), '"'),
      seq('"""', repeat(choice(
        $.multiline_string_content,
        /"[^"]/,
        /""[^"]/,
        $.escape_sequence,
        $.interpolation,
        '$'
      )), '"""')
    ),

    string_content: $ => token(prec(1, /[^"\\$\n]+/)),
    multiline_string_content: $ => token(prec(1, /[^"\\$]+/)),

    interpolation: $ => seq('${', $._expression, '}'),

    char: $ => seq("'", choice(/[^'\\\n]/, $.escape_sequence), "'"),

    escape_sequence: $ => token(seq(
      '\\',
      choice(
        /[nrt0'"\\]/,
        /x[0-9a-fA-F]{2}/,
        /u\{[0-9a-fA-F]+\}/
      )
    )),

    true: $ => 'true',
    false: $ => 'false',
    null: $ => 'null',
    this: $ => 'this',
    super: $ => 'super',
  }
});

function commaSep(rule) {
  return optional(commaSep1(rule));
}

function commaSep1(rule) {
  return seq(rule, repeat(seq(',', rule)));
}
