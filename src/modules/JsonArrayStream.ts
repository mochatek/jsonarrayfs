import { Transform, TransformCallback } from "node:stream";
import { ERRORS, TOKENS, WHITESPACE_CHARACTERS } from "../utils/constants";
import { JsonArrayStreamError } from "../utils/errors";
import { ParserState } from "../types";

class JsonArrayStream<T> extends Transform {
  /**
   * Special value to distinguish between JSON null and stream EOF.
   * Use this to check if a streamed element is null:
   *
   * ```typescript
   * if (element === JsonArrayStream.NULL) {
   *   console.log('Found null in JSON');
   * }
   * ```
   */
  static readonly NULL = Symbol("JsonArrayStream.NULL");

  private state: ParserState<T>;

  constructor(sourceEncoding?: BufferEncoding) {
    super({
      readableObjectMode: true,
      writableObjectMode: false,
    });
    if (!sourceEncoding) {
      console.warn(
        "Warning: Encoding not specified. Defaulting to UTF-8 to prevent issues.",
      );
    }
    this.state = {
      encoding: sourceEncoding || "utf-8",
      rootDetected: false,
      elementDetected: false,
      elementType: "others",
      elementParser: null,
      elementEnclosureCount: 0,
      isCharInsideQuotes: false,
      isCharEscaped: false,
      commaSkipped: false,
      buffer: "",
      parsedElements: [],
    };
  }

  private resetParser() {
    this.state.elementDetected = false;
    this.state.elementType = "others";
    this.state.elementParser = null;
    this.state.elementEnclosureCount = 0;
    this.state.isCharInsideQuotes = false;
    this.state.isCharEscaped = false;
    this.state.buffer = "";
  }

  private parseElement<T>() {
    try {
      const element: T = JSON.parse(this.state.buffer);
      return element;
    } catch (error) {
      throw new JsonArrayStreamError(ERRORS.INVALID_ELEMENT(this.state.buffer));
    }
  }

  private parseStringElement(char: string) {
    this.state.buffer = `${this.state.buffer}${char}`;

    if (char === TOKENS.QUOTE) {
      if (this.state.isCharInsideQuotes && !this.state.isCharEscaped) {
        const element = this.parseElement<T>();
        this.state.parsedElements.push(element);
        return true;
      }

      if (this.state.buffer === TOKENS.QUOTE) {
        this.state.isCharInsideQuotes = true;
      } else if (this.state.isCharEscaped) {
        this.state.isCharEscaped = false;
      }
    } else if (char === TOKENS.ESCAPE) {
      this.state.isCharEscaped = !this.state.isCharEscaped;
    } else if (this.state.isCharEscaped) {
      this.state.isCharEscaped = false;
    }

    return false;
  }

  private parsePrimitiveElement(char: string) {
    if (
      [TOKENS.COMMA, TOKENS.BRACKET.CLOSE, ...WHITESPACE_CHARACTERS].includes(
        char,
      )
    ) {
      const element = this.parseElement<T>();
      this.state.parsedElements.push(element);
      return true;
    }

    this.state.buffer = `${this.state.buffer}${char}`;
    return false;
  }

  private parseContainerElement(char: string) {
    const ENCLOSURE =
      this.state.elementType === "array" ? TOKENS.BRACKET : TOKENS.BRACE;

    if (char === ENCLOSURE.OPEN && !this.state.isCharInsideQuotes) {
      this.state.buffer = `${this.state.buffer}${char}`;
      this.state.elementEnclosureCount += 1;
    } else if (char === ENCLOSURE.CLOSE && !this.state.isCharInsideQuotes) {
      this.state.buffer = `${this.state.buffer}${char}`;
      this.state.elementEnclosureCount -= 1;

      if (this.state.elementEnclosureCount === 0) {
        const element = this.parseElement<T>();
        this.state.parsedElements.push(element);
        return true;
      }
    } else if (this.state.buffer.length) {
      this.state.buffer = `${this.state.buffer}${char}`;

      if (char === TOKENS.ESCAPE) {
        this.state.isCharEscaped = !this.state.isCharEscaped;
      } else if (char === TOKENS.QUOTE && !this.state.isCharEscaped) {
        this.state.isCharInsideQuotes = !this.state.isCharInsideQuotes;
      } else if (this.state.isCharEscaped) {
        this.state.isCharEscaped = false;
      }
    }

    return false;
  }

  _transform(
    chunk: Buffer,
    encoding: BufferEncoding,
    callback: TransformCallback,
  ) {
    try {
      const decodedString = Buffer.from(
        chunk as unknown as string,
        this.state.encoding,
      ).toString("utf-8");
      for (let char of decodedString) {
        if (!this.state.rootDetected) {
          if (![...WHITESPACE_CHARACTERS, TOKENS.BRACKET.OPEN].includes(char)) {
            throw new JsonArrayStreamError(ERRORS.NOT_AN_ARRAY);
          }

          this.state.rootDetected = char === TOKENS.BRACKET.OPEN;
          continue;
        }

        if (!this.state.elementDetected) {
          if (char === TOKENS.BRACKET.CLOSE) {
            if (this.state.buffer.length > 0)
              throw new JsonArrayStreamError(ERRORS.INVALID_JSON_ARRAY);
            if (this.state.commaSkipped)
              throw new JsonArrayStreamError(ERRORS.TRAILING_COMMA);
            break;
          } else if (char === TOKENS.COMMA) {
            if (this.state.commaSkipped)
              throw new JsonArrayStreamError(ERRORS.MISSING_ELEMENT);
            else this.state.commaSkipped = true;
          }

          this.state.elementDetected = ![
            TOKENS.COMMA,
            ...WHITESPACE_CHARACTERS,
          ].includes(char);
        }

        if (this.state.elementDetected) {
          if (!this.state.elementParser) {
            if (char === TOKENS.BRACKET.OPEN) {
              this.state.elementType = "array";
              this.state.elementParser = this.parseContainerElement.bind(this);
            } else if (char === TOKENS.BRACE.OPEN) {
              this.state.elementType = "object";
              this.state.elementParser = this.parseContainerElement.bind(this);
            } else if (char === TOKENS.QUOTE) {
              this.state.elementType = "string";
              this.state.elementParser = this.parseStringElement.bind(this);
            } else {
              this.state.elementType = "others";
              this.state.elementParser = this.parsePrimitiveElement.bind(this);
            }
            this.state.commaSkipped = false;
          }

          const parsed = this.state.elementParser(char);
          if (parsed) {
            this.resetParser();
            if (char === TOKENS.COMMA) this.state.commaSkipped = true;
          }
        }
      }

      if (this.state.parsedElements.length) {
        for (const element of this.state.parsedElements) {
          this.push(element === null ? JsonArrayStream.NULL : element);
        }
        this.state.parsedElements = [];
      }
      callback();
    } catch (error) {
      callback(error as Error);
    }
  }

  _flush(callback: TransformCallback) {
    if (this.state.buffer.length > 0 || !this.state.rootDetected) {
      callback(new JsonArrayStreamError(ERRORS.INVALID_JSON_ARRAY));
    } else {
      callback();
    }
  }
}

export default JsonArrayStream;
