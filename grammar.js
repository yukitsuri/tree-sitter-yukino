module.exports = grammar({
  name: 'yukino',

  externals: $ => [
    $.block_comment,
    $._string_content,
    $._multiline_string_content,
  ],

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
    [$.function_type],
    [$.cfun_declaration],
    [$.import_path],
    [$.import_pattern],
    [$.import_segment],
    [$._loop_label, $.while_statement],
    [$._loop_label, $._expression],
    [$.c_attribute_item, $.parameter],
    [$.binary_expression, $.unary_expression, $.call_expression],
    [$.binary_expression, $.call_expression],
    [$.block, $.map_expression],
    [$._loop_modifiers, $.region_expression],
    [$.unary_expression],
    [$.user_type, $._expression],
    [$.c_attribute_item, $._expression],
    [$.c_attribute_item, $.literal],
    [$.parameters, $.function_type],
    [$.parameter, $.user_type],
    [$.switch_arm, $._expression],
  ],

  word: $ => $.identifier,

  rules: {
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
      $.while_statement,
      $.for_statement,
      $.loop_statement,
      $.sus_statement,
      $.expression_statement,
    ),

    expression_statement: $ => seq($._expression, optional(';')),

    line_comment: $ => token(seq('//', /.*/)),
    comment: $ => choice($.line_comment, $.block_comment),

    module_attribute: $ => choice(
      seq('#![', commaSep1($.attribute_item), optional(','), ']'),
      seq('!#[', commaSep1($.attribute_item), optional(','), ']')
    ),

    attribute: $ => choice(
      seq('|', commaSep1($.c_attribute_item), optional(','), '|'),
      seq('#[', commaSep1($.attribute_item), optional(','), ']')
    ),

    c_attribute_item: $ => seq(
      field('name', $.identifier),
      optional(choice(
        seq('=', choice($.identifier, $.string, $.number)),
        seq('(', commaSep(choice($.string, $.number, $.identifier)), ')')
      ))
    ),

    attribute_item: $ => seq(
      optional('!'),
      field('name', choice($.scoped_identifier, $.identifier)),
      optional(choice(
        seq('=', choice($.string, $.number, $.boolean)),
        seq('(', commaSep(choice($.attribute_item, $.string, $.number, $.boolean)), ')')
      ))
    ),

    // Functions
    function_declaration: $ => seq(
      repeat($.attribute),
      optional('public'),
      'fun',
      field('name', choice($.identifier, alias('init', $.identifier), alias('get', $.identifier), alias('set', $.identifier))),
      optional($.type_parameters),
      field('parameters', $.parameters),
      optional(seq('->', field('return_type', $._type))),
      choice(
        field('body', $.block),
        seq('=>', field('body', $._expression), optional(';'))
      )
    ),

    cfun_declaration: $ => seq(
      repeat($.attribute),
      optional('public'),
      'cfun',
      field('name', $.identifier),
      optional(seq('as', field('symbol', $.string))),
      field('parameters', $.parameters),
      optional(seq('->', field('return_type', $._type))),
      optional(field('body', $.block)),
      optional(';')
    ),

    externc_block: $ => seq(
      'externc',
      optional(field('header', $.string)),
      '{',
      repeat(choice(
        $.cfun_declaration,
        $.struct_declaration,
        ';'
      )),
      '}'
    ),

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

    // Enums
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

    enum_variant: $ => seq(
      repeat($.attribute),
      field('name', $.identifier),
      optional(field('parameters', $.enum_variant_parameters)),
      optional(seq('=', $._expression))
    ),

    enum_variant_parameters: $ => seq(
      '(',
      commaSep($.enum_variant_parameter),
      optional(','),
      ')'
    ),

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

    // Macros
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

    // Aliases
    alias_declaration: $ => seq(
      optional('public'),
      'alias',
      choice(
        seq(field('namespace', $.identifier), '#', field('symbol', $.identifier)),
        field('symbol', $.identifier)
      ),
      'as',
      field('name', $.identifier),
      optional(';')
    ),

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

    // Imports
    import_statement: $ => seq(
      repeat($.attribute),
      optional('public'),
      'load',
      field('module', $.import_path),
      optional(seq(':', field('symbols', $.import_symbols_clause))),
      optional(';')
    ),

    import_path: $ => seq(
      choice(
        seq(field('prefix', $.relative_prefix), optional(prec.dynamic(1, $.import_segment))),
        field('prefix', $.identifier)
      ),
      repeat(seq('.', $.import_segment))
    ),

    relative_prefix: $ => token(seq(repeat1(choice('.', '..', '...')), optional('!'))),

    import_segment: $ => choice(
      prec.dynamic(1, seq($.import_pattern, '!')),
      $.import_pattern
    ),

    import_pattern: $ => choice(
      prec.dynamic(1, seq('*', $.identifier)),
      prec.dynamic(1, seq($.identifier, '*')),
      '*',
      $.identifier
    ),

    import_symbols_clause: $ => seq(
      commaSep1($.import_pattern),
      optional(seq('as', commaSep1($.identifier)))
    ),

    // Fields & Methods
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

    method_declaration: $ => seq(
      repeat($.attribute),
      optional('public'),
      optional('static'),
      'fun',
      field('name', choice($.identifier, alias('init', $.identifier), alias('get', $.identifier), alias('set', $.identifier))),
      optional($.type_parameters),
      field('parameters', $.parameters),
      optional(seq('->', field('return_type', $._type))),
      optional(field('body', $.block)),
      optional(';')
    ),

    property_declaration: $ => seq(
      repeat($.attribute),
      optional('public'),
      choice(
        seq('get', field('name', $.identifier), '(', ')', optional(seq('->', field('return_type', $._type))), field('body', $.block)),
        seq('set', field('name', $.identifier), '(', field('parameter', $.parameter), ')', field('body', $.block))
      )
    ),

    operator_declaration: $ => seq(
      repeat($.attribute),
      optional('public'),
      'operator',
      field('name', $.operator_symbol),
      field('parameters', $.parameters),
      optional(seq('->', field('return_type', $._type))),
      field('body', $.block)
    ),

    operator_symbol: $ => choice(
      '+', '-', '*', '/', '%', '**',
      '==', '!=', '<', '<=', '>', '>=',
      '[]', '[]='
    ),

    // Variables & Mutation
    variable_declaration: $ => seq(
      repeat($.attribute),
      optional('public'),
      choice('set', 'static'),
      field('name', $.identifier),
      optional(seq(':', field('type', $._type))),
      optional(seq('=', field('value', $._expression))),
      optional(';')
    ),

    rewrite_statement: $ => seq(
      'rewrite',
      field('target', $._expression),
      choice('=', '+=', '-=', '*=', '/=', '%='),
      field('value', $._expression),
      optional(';')
    ),

    assignment_statement: $ => prec.right(seq(
      field('target', $._expression),
      choice('=', '+=', '-=', '*=', '/=', '%=', '**=', '&=', '|=', '^=', '<<=', '>>='),
      field('value', $._expression),
      optional(';')
    )),

    // Control flow
    break_statement: $ => seq('break', optional(field('label', $.identifier)), optional(';')),
    continue_statement: $ => seq('continue', optional(field('label', $.identifier)), optional(';')),
    return_statement: $ => seq('return', optional($._expression), optional(';')),
    recur_statement: $ => seq('recur', optional($.parenthesized_expression), optional(';')),
    defer_statement: $ => seq('defer', field('body', $.block)),
    space_statement: $ => seq('space', optional(';')),

    if_statement: $ => prec.right(1, seq(
      'if',
      field('condition', $._expression),
      field('consequence', $.block),
      repeat(field('alternative_branch', $.elif_clause)),
      optional(field('alternative', $.else_clause))
    )),

    elif_clause: $ => seq(
      'elif',
      field('condition', $._expression),
      field('consequence', $.block)
    ),

    else_clause: $ => seq(
      'else',
      field('body', $.block)
    ),

    switch_statement: $ => seq(
      'switch',
      field('value', $._expression),
      '{',
      repeat(choice($.switch_arm, ';')),
      '}'
    ),

    switch_arm: $ => seq(
      field('pattern', choice($._pattern, 'else')),
      optional(seq('if', field('guard', $._expression))),
      '->',
      field('body', choice($._expression, $.block)),
      optional(',')
    ),

    _loop_modifiers: $ => choice(
      seq(field('region', 'region'), optional(field('label', seq(':', $.identifier)))),
      field('label', seq(':', $.identifier))
    ),

    _loop_label: $ => seq(':', $.identifier),

    while_statement: $ => seq(
      'while',
      optional($._loop_modifiers),
      field('condition', $._expression),
      field('body', $.block)
    ),

    for_statement: $ => seq(
      'for',
      optional($._loop_modifiers),
      choice(
        seq(field('index', $.identifier), ',', field('item', $.identifier)),
        field('item', $.identifier)
      ),
      'in',
      field('iterable', $._expression),
      field('body', $.block)
    ),

    loop_statement: $ => seq(
      'loop',
      optional($._loop_modifiers),
      field('body', $.block)
    ),

    sus_statement: $ => seq(
      'sus',
      field('body', $.block),
      repeat($.catch_clause),
      optional($.finally_clause)
    ),

    catch_clause: $ => seq(
      'catch',
      optional(seq(field('error', $.identifier), optional(seq(':', field('type', $._type))))),
      field('body', $.block)
    ),

    finally_clause: $ => seq(
      'finally',
      field('body', $.block)
    ),

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
      commaSep1($.type_parameter),
      optional(','),
      '>'
    ),

    type_parameter: $ => seq(
      field('name', $.identifier),
      optional(seq(':', field('bound', $._type)))
    ),

    // Types
    _type: $ => choice(
      $.primitive_type,
      $.user_type,
      $.generic_type,
      $.pointer_type,
      $.array_type,
      $.tuple_type,
      $.function_type,
      $.union_type,
      $.nullable_type
    ),

    primitive_type: $ => choice(
      'int8', 'int16', 'int32', 'int64',
      'uint8', 'uint16', 'uint32', 'uint64',
      'float32', 'float64',
      'bool', 'char', 'string', 'bytes', 'void', 'never',
      'c_char', 'c_int', 'c_size_t', 'c_void', 'c_long', 'c_short', 'c_uint',
      'usize', 'isize'
    ),

    user_type: $ => choice(
      $.identifier,
      $.scoped_identifier
    ),

    generic_type: $ => prec(2, seq(
      field('name', choice($.user_type, $.primitive_type)),
      '<',
      commaSep1($._type),
      optional(','),
      '>'
    )),

    pointer_type: $ => prec(2, seq(
      'ptr',
      '<',
      $._type,
      '>'
    )),

    array_type: $ => prec(2, seq(
      $._type,
      '[',
      optional($._expression),
      ']'
    )),

    tuple_type: $ => seq(
      '(',
      commaSep1($._type),
      optional(','),
      ')'
    ),

    function_type: $ => seq(
      'fun',
      '(',
      commaSep($._type),
      ')',
      optional(seq('->', $._type))
    ),

    union_type: $ => prec.left(1, seq(
      $._type,
      '|',
      $._type
    )),

    nullable_type: $ => prec(3, seq(
      $._type,
      '?'
    )),

    // Patterns
    _pattern: $ => choice(
      $.identifier,
      $.literal,
      $.wildcard_pattern,
      $.tuple_pattern,
      $.struct_pattern,
      $.variant_pattern
    ),

    wildcard_pattern: $ => '_',

    tuple_pattern: $ => seq('(', commaSep($._pattern), optional(','), ')'),

    struct_pattern: $ => seq(
      field('name', choice($.scoped_identifier, $.identifier)),
      '{',
      commaSep($.struct_pattern_field),
      optional(','),
      '}'
    ),

    struct_pattern_field: $ => seq(
      field('name', $.identifier),
      optional(seq(':', field('value', $._pattern)))
    ),

    variant_pattern: $ => choice(
      seq(
        field('enum', $.identifier),
        '::',
        field('variant', $.identifier),
        optional(seq('(', commaSep($._pattern), optional(','), ')'))
      ),
      seq(
        field('variant', $.identifier),
        '(',
        commaSep($._pattern),
        optional(','),
        ')'
      )
    ),

    // Expressions
    _expression: $ => choice(
      $.identifier,
      $.scoped_identifier,
      $.literal,
      $.binary_expression,
      $.unary_expression,
      $.call_expression,
      $.field_expression,
      $.index_expression,
      $.parenthesized_expression,
      $.array_expression,
      $.map_expression,
      $.struct_expression,
      $.range_expression,
      $.lambda_expression,
      $.cast_expression,
      $.is_expression,
      $.panic_expression,
      $.region_expression,
      $.macro_call_expression,
      $.init_expression,
      $.if_statement,
      $.switch_statement,
      $.block
    ),

    init_expression: $ => prec(15, seq(
      'init',
      optional(seq('<', commaSep1($._type), '>')),
      field('arguments', $.argument_list)
    )),

    scoped_identifier: $ => prec(17, seq(
      choice($.scoped_identifier, $.primitive_type, $.identifier),
      '::',
      $.identifier
    )),

    region_expression: $ => seq(
      'region',
      optional(seq('(', field('argument', $._expression), ')')),
      field('body', $.block)
    ),

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
      commaSep($.map_entry),
      optional(','),
      '}'
    ),

    map_entry: $ => seq(
      field('key', $._expression),
      ':',
      field('value', $._expression)
    ),

    struct_expression: $ => prec.dynamic(2, seq(
      field('name', choice($.scoped_identifier, $.identifier)),
      '{',
      commaSep(choice($.field_initializer, $.identifier)),
      optional(','),
      '}'
    )),

    field_initializer: $ => seq(
      field('name', $.identifier),
      ':',
      field('value', $._expression)
    ),

    range_expression: $ => prec.left(7, seq(
      $._expression,
      choice('..', '..='),
      $._expression
    )),

    lambda_expression: $ => prec.right(0, choice(
      seq('fun', field('parameters', $.parameters), optional(seq('->', field('return_type', $._type))), choice(field('body', $.block), seq('=>', field('body', $._expression)))),
      seq('|', commaSep($.parameter), optional(','), '|', optional(seq('->', field('return_type', $._type))), choice(field('body', $.block), seq('=>', field('body', $._expression))))
    )),

    cast_expression: $ => prec(16, seq(
      'cast',
      '(',
      field('value', $._expression),
      ',',
      field('type', choice($._type, $.string)),
      ')'
    )),

    is_expression: $ => prec.left(9, seq(
      $._expression,
      'is',
      choice($._type, $.identifier)
    )),

    panic_expression: $ => prec(16, seq(
      'panic',
      '(',
      field('error', $._expression),
      ')'
    )),

    macro_call_expression: $ => prec(16, seq(
      field('name', choice($.scoped_identifier, $.identifier)),
      '!',
      choice(
        seq('(', commaSep($._expression), optional(','), ')'),
        seq('[', commaSep($._expression), optional(','), ']'),
        seq('{', repeat($._statement), '}')
      )
    )),

    binary_expression: $ => {
      const table = [
        [1, '||'],
        [2, '&&'],
        [3, '|'],
        [4, '^'],
        [5, '&'],
        [6, '??'],
        [8, choice('==', '!=')],
        [9, choice('<', '<=', '>', '>=')],
        [10, choice('<<', '>>')],
        [11, choice('+', '-')],
        [12, choice('*', '/', '%')],
        [13, '**'],
      ];

      return choice(...table.map(([precedence, operator]) =>
        prec.left(precedence, seq(
          field('left', $._expression),
          field('operator', operator),
          field('right', $._expression)
        ))
      ));
    },

    unary_expression: $ => choice(
      prec.right(15, seq(choice('-', '!', '~', '*', '&', 'ref', seq('ref', '~')), $._expression)),
      prec.left(17, seq($._expression, '?'))
    ),

    call_expression: $ => prec(16, seq(
      field('function', $._expression),
      optional(field('type_arguments', seq('<', commaSep1($._type), '>'))),
      field('arguments', $.argument_list)
    )),

    argument_list: $ => seq(
      '(',
      commaSep(choice(
        seq(field('name', $.identifier), ':', field('value', $._expression)),
        $._expression
      )),
      optional(','),
      ')'
    ),

    field_expression: $ => prec(17, seq(
      field('argument', $._expression),
      choice('.', '?.'),
      field('field', choice($.identifier, $.integer))
    )),

    index_expression: $ => prec(17, seq(
      field('argument', $._expression),
      '[',
      field('index', $._expression),
      ']'
    )),

    // Literals
    literal: $ => choice(
      $.number,
      $.string,
      $.char,
      $.boolean,
      $.null,
      $.this,
      $.super
    ),

    identifier: $ => /[a-zA-Z_][a-zA-Z0-9_]*/,

    number: $ => choice($.integer, $.float),

    integer: $ => token(seq(
      choice(
        /0[xX][0-9a-fA-F_]*[0-9a-fA-F][0-9a-fA-F_]*/,
        /0[bB][01_]*[01][01_]*/,
        /0[oO][0-7_]*[0-7][0-7_]*/,
        /[0-9][0-9_]*/
      ),
      optional(choice('i8', 'i16', 'i32', 'i64', 'u8', 'u16', 'u32', 'u64'))
    )),

    float: $ => token(choice(
      seq(
        choice(
          seq(/[0-9][0-9_]*\.[0-9][0-9_]*/, optional(/[eE][+-]?[0-9][0-9_]*/)),
          seq(/[0-9][0-9_]*/, /[eE][+-]?[0-9][0-9_]*/)
        ),
        optional(choice('f32', 'f64'))
      ),
      seq(/[0-9][0-9_]*/, choice('f32', 'f64'))
    )),

    string: $ => choice(
      seq(
        '"""',
        repeat(choice(
          alias($._multiline_string_content, $.string_content),
          $.escape_sequence,
          $.interpolation
        )),
        '"""'
      ),
      seq(
        '"',
        repeat(choice(
          alias($._string_content, $.string_content),
          $.escape_sequence,
          $.interpolation
        )),
        '"'
      )
    ),

    escape_sequence: $ => token.immediate(seq(
      '\\',
      choice(
        /[^xuU]/,
        /\$[0-9a-zA-Z_]*/,
        /x[0-9a-fA-F]{2}/,
        /u\{[0-9a-fA-F]+\}/,
        /u[0-9a-fA-F]{4}/,
        /U[0-9a-fA-F]{8}/
      )
    )),

    interpolation: $ => seq(
      '${',
      $._expression,
      '}'
    ),

    char: $ => token(seq(
      "'",
      choice(/[^'\\]/, /\\./),
      "'"
    )),

    boolean: $ => choice($.true, $.false),
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
