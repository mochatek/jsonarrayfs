const CHARACTER = {
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
  CHARACTER.SPACE,
  CHARACTER.TAB,
  CHARACTER.NEW_LINE,
  CHARACTER.CARRIAGE_RETURN,
  CHARACTER.ZERO_WIDTH_NO_BREAK_SPACE,
];

const ERRORS = {
  INVALID_FILE: "Invalid JSON array file",
  INVALID_ELEMENT: (element: string) =>
    `Invalid element found in JSON array - ${element}`,
};

export { CHARACTER, WHITESPACE_CHARACTERS, ERRORS };
