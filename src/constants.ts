const CHARACTER = {
  BRACKET: {
    OPEN: `[`,
    CLOSE: `]`,
  },
  BRACE: {
    OPEN: `{`,
    CLOSE: `}`,
  },
  QUOTE: `"`,
  ESCAPE: `\\`,
  SPACE: " ",
  COMMA: ",",
  NEW_LINE: "\n",
};

const ERRORS = {
  INVALID_FILE: "Invalid JSON array file",
  INVALID_ELEMENT: (element: string) =>
    `Invalid element found in JSON array - ${element}`,
};

export { CHARACTER, ERRORS };
