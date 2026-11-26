#include "tree_sitter/parser.h"

#include <stdbool.h>
#include <stdint.h>
#include <wctype.h>

enum TokenType {
  BLOCK_COMMENT,
  STRING_CONTENT,
  MULTILINE_STRING_CONTENT,
};

void *tree_sitter_yukino_external_scanner_create(void) {
  return NULL;
}

void tree_sitter_yukino_external_scanner_destroy(void *payload) {
  (void)payload;
}

unsigned tree_sitter_yukino_external_scanner_serialize(void *payload, char *buffer) {
  (void)payload;
  (void)buffer;
  return 0;
}

void tree_sitter_yukino_external_scanner_deserialize(
  void *payload,
  const char *buffer,
  unsigned length
) {
  (void)payload;
  (void)buffer;
  (void)length;
}

static bool scan_string_content(TSLexer *lexer, bool is_multiline) {
  bool has_content = false;

  while (lexer->lookahead != 0) {
    if (!is_multiline && (lexer->lookahead == '\n' || lexer->lookahead == '\r')) {
      break;
    }

    if (lexer->lookahead == '\\') {
      break;
    }

    if (lexer->lookahead == '$') {
      lexer->mark_end(lexer);
      lexer->advance(lexer, false);
      if (lexer->lookahead == '{') {
        break;
      }
      has_content = true;
      lexer->mark_end(lexer);
      continue;
    }

    if (lexer->lookahead == '"') {
      if (!is_multiline) {
        break;
      }
      lexer->mark_end(lexer);
      lexer->advance(lexer, false);
      if (lexer->lookahead == '"') {
        lexer->advance(lexer, false);
        if (lexer->lookahead == '"') {
          break;
        }
      }
      has_content = true;
      lexer->mark_end(lexer);
      continue;
    }

    lexer->advance(lexer, false);
    has_content = true;
    lexer->mark_end(lexer);
  }

  if (has_content) {
    lexer->result_symbol = is_multiline ? MULTILINE_STRING_CONTENT : STRING_CONTENT;
    return true;
  }

  return false;
}

bool tree_sitter_yukino_external_scanner_scan(
  void *payload,
  TSLexer *lexer,
  const bool *valid_symbols
) {
  (void)payload;

  bool in_error_recovery =
    valid_symbols[STRING_CONTENT] && valid_symbols[MULTILINE_STRING_CONTENT];
  if (!in_error_recovery) {
    if (valid_symbols[STRING_CONTENT]) {
      return scan_string_content(lexer, false);
    }
    if (valid_symbols[MULTILINE_STRING_CONTENT]) {
      return scan_string_content(lexer, true);
    }
  }

  if (!valid_symbols[BLOCK_COMMENT]) {
    return false;
  }

  while (iswspace(lexer->lookahead)) {
    lexer->advance(lexer, true);
  }

  if (lexer->lookahead != '/') {
    return false;
  }

  lexer->advance(lexer, false);
  if (lexer->lookahead != '*') {
    return false;
  }
  lexer->advance(lexer, false);

  uint32_t depth = 1;
  while (lexer->lookahead != 0) {
    if (lexer->lookahead == '/') {
      lexer->advance(lexer, false);
      if (lexer->lookahead == '*') {
        lexer->advance(lexer, false);
        depth++;
      }
    } else if (lexer->lookahead == '*') {
      lexer->advance(lexer, false);
      if (lexer->lookahead == '/') {
        lexer->advance(lexer, false);
        depth--;
        if (depth == 0) {
          lexer->mark_end(lexer);
          lexer->result_symbol = BLOCK_COMMENT;
          return true;
        }
      }
    } else {
      lexer->advance(lexer, false);
    }
  }

  return false;
}
