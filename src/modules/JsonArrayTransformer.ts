import { Transform, TransformCallback } from "stream";
import { CHARACTER } from "../constants";

class JsonArrayStreamer<T> extends Transform {
  private encoding: BufferEncoding;
  private rootDetected: boolean;
  private elementDetected: boolean;
  private elementType: "string" | "array" | "object" | "others";
  private elementParser: ((char: string) => void) | null;
  private elementEnclosureCount: number;
  private isCharInsideQuotes: boolean;
  private isCharEscaped: boolean;
  private buffer: string;
  private parsedElements: T[];

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
    this.encoding = sourceEncoding || "utf-8";
    this.rootDetected = false;
    this.elementDetected = false;
    this.elementType = "others";
    this.elementParser = null;
    this.elementEnclosureCount = 0;
    this.isCharInsideQuotes = false;
    this.isCharEscaped = false;
    this.buffer = "";
    this.parsedElements = [];
  }

  private resetParser() {
    this.elementDetected = false;
    this.elementType = "others";
    this.elementParser = null;
    this.elementEnclosureCount = 0;
    this.isCharInsideQuotes = false;
    this.isCharEscaped = false;
    this.buffer = "";
  }

  private parseElement<T>() {
    try {
      const element: T = JSON.parse(this.buffer);
      return element;
    } catch (error) {
      throw new Error(`Invalid element: ${this.buffer}`);
    }
  }

  private parseStringElement(char: string) {
    this.buffer = `${this.buffer}${char}`;

    if (char === CHARACTER.QUOTE) {
      if (this.isCharInsideQuotes && !this.isCharEscaped) {
        const element = this.parseElement<T>();
        this.parsedElements.push(element);
        this.resetParser();
      } else if (this.buffer === CHARACTER.QUOTE) {
        this.isCharInsideQuotes = true;
      } else if (this.isCharEscaped) {
        this.isCharEscaped = false;
      }
    } else if (char === CHARACTER.ESCAPE) {
      this.isCharEscaped = !this.isCharEscaped;
    } else if (this.isCharEscaped) {
      this.isCharEscaped = false;
    }
  }

  private parsePrimitiveElement(char: string) {
    if ([CHARACTER.COMMA, CHARACTER.NEW_LINE, CHARACTER.SPACE].includes(char)) {
      const element = this.parseElement<T>();
      this.parsedElements.push(element);
      this.resetParser();
    } else {
      this.buffer = `${this.buffer}${char}`;
    }
  }

  private parseContainerElement(char: string) {
    const ENCLOSURE =
      this.elementType === "array" ? CHARACTER.BRACKET : CHARACTER.BRACE;

    if (char === ENCLOSURE.OPEN && !this.isCharInsideQuotes) {
      this.buffer = `${this.buffer}${char}`;
      this.elementEnclosureCount += 1;
    } else if (char === ENCLOSURE.CLOSE && !this.isCharInsideQuotes) {
      this.buffer = `${this.buffer}${char}`;
      this.elementEnclosureCount -= 1;

      if (this.elementEnclosureCount === 0) {
        const element = this.parseElement<T>();
        this.parsedElements.push(element);
        this.resetParser();
      }
    } else if (this.buffer.length) {
      this.buffer = `${this.buffer}${char}`;

      if (char === CHARACTER.ESCAPE) {
        this.isCharEscaped = !this.isCharEscaped;
      } else if (char === CHARACTER.QUOTE && !this.isCharEscaped) {
        this.isCharInsideQuotes = !this.isCharInsideQuotes;
      } else if (this.isCharEscaped) {
        this.isCharEscaped = false;
      }
    }
  }

  _transform(
    chunk: Buffer,
    encoding: BufferEncoding,
    callback: TransformCallback,
  ) {
    try {
      const decodedString = Buffer.from(
        chunk as unknown as string,
        this.encoding,
      ).toString("utf-8");
      for (let char of decodedString) {
        if (!this.rootDetected) {
          if (
            ![
              CHARACTER.SPACE,
              CHARACTER.NEW_LINE,
              CHARACTER.BRACKET.OPEN,
            ].includes(char)
          ) {
            throw new Error("Invalid file structure");
          }

          this.rootDetected = char === CHARACTER.BRACKET.OPEN;
          continue;
        }

        if (!this.elementDetected) {
          if (char === CHARACTER.BRACKET.CLOSE) break;
          this.elementDetected = ![
            CHARACTER.SPACE,
            CHARACTER.COMMA,
            CHARACTER.NEW_LINE,
          ].includes(char);
        }

        if (this.elementDetected) {
          if (!this.elementParser) {
            if (char === CHARACTER.BRACKET.OPEN) {
              this.elementType = "array";
              this.elementParser = this.parseContainerElement.bind(this);
            } else if (char === CHARACTER.BRACE.OPEN) {
              this.elementType = "object";
              this.elementParser = this.parseContainerElement.bind(this);
            } else if (char === CHARACTER.QUOTE) {
              this.elementType = "string";
              this.elementParser = this.parseStringElement.bind(this);
            } else {
              this.elementType = "others";
              this.elementParser = this.parsePrimitiveElement.bind(this);
            }
          }

          this.elementParser(char);
        }
      }

      if (this.parsedElements.length) {
        callback(
          null,
          this.parsedElements.splice(0, this.parsedElements.length),
        );
      } else {
        callback();
      }
    } catch (error) {
      callback(error as Error);
    }
  }
}

export default JsonArrayStreamer;
