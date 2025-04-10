const TOKENS = {
  BRACKET: {
    OPEN: "[",
    CLOSE: "]",
  },
  BRACE: {
    OPEN: "{",
    CLOSE: "}",
  },
  QUOTE: '"',
  ESCAPE: "\\",
  SPACE: " ",
  COMMA: ",",
  TAB: "\t",
  CARRIAGE_RETURN: "\r",
  NEW_LINE: "\n",
  ZERO_WIDTH_NO_BREAK_SPACE: "\uFEFF",
};

const WHITESPACE_CHARACTERS = [
  TOKENS.SPACE,
  TOKENS.TAB,
  TOKENS.NEW_LINE,
  TOKENS.CARRIAGE_RETURN,
  TOKENS.ZERO_WIDTH_NO_BREAK_SPACE,
];

const APPEND_BATCH_SIZE = 1000;

const APPEND_WINDOW_SIZE = 1024 * 4;

const ERRORS = {
  NOT_AN_ARRAY: 'Input must be a valid JSON array starting with "["',
  INVALID_JSON_ARRAY:
    "Invalid JSON array format - array is incomplete or malformed",
  MISSING_ELEMENT: "Missing element between commas in JSON array",
  TRAILING_COMMA: "Trailing comma is not allowed in JSON array",
  INVALID_ELEMENT: (element: string) =>
    `Invalid JSON element found in array: ${element}`,
} as const;

export {
  TOKENS,
  WHITESPACE_CHARACTERS,
  APPEND_BATCH_SIZE,
  APPEND_WINDOW_SIZE,
  ERRORS,
};
