import { ReadStream, createReadStream } from "fs";
import { once } from "events";
import type { ElementType, ReadStreamOptions } from "../index.types";
import { CHARACTER, ERRORS } from "../constants";

class JsonArrayStreamer<T> {
  private readStream: ReadStream | null;
  private rootDetected: boolean;
  private elementDetected: boolean;
  private elementType: ElementType;
  private elementParser:
    | ((char: string, filter?: (element: T) => boolean) => void)
    | null;
  private elementEnclosureCount: number;
  private isCharInsideQuotes: boolean;
  private isCharEscaped: boolean;
  private chunkBuffer: string;
  private resultBuffer: T[];

  private constructor(path: string, options?: ReadStreamOptions) {
    this.readStream = createReadStream(
      path,
      JsonArrayStreamer.sanitizeReadStreamOptions(options)
    );
    this.rootDetected = false;
    this.elementDetected = false;
    this.elementType = "others";
    this.elementParser = null;
    this.elementEnclosureCount = 0;
    this.isCharInsideQuotes = false;
    this.isCharEscaped = false;
    this.chunkBuffer = "";
    this.resultBuffer = [];
  }

  private async *chunkGenerator() {
    if (!this.readStream) throw new Error("Stream not initialized");

    for await (const chunk of this.readStream) {
      yield chunk;
    }
  }

  private getParsedElement<T>() {
    try {
      const element: T = JSON.parse(this.chunkBuffer);
      return element;
    } catch (error) {
      throw new Error(ERRORS.INVALID_ELEMENT(this.chunkBuffer));
    }
  }

  private addToResult(element: T, filter?: (element: T) => boolean) {
    if (!filter) {
      this.resultBuffer.push(element);
    } else {
      try {
        if (filter(element)) this.resultBuffer.push(element);
      } catch (_) {}
    }
  }

  private resetParser() {
    this.elementDetected = false;
    this.elementType = "others";
    this.elementParser = null;
    this.elementEnclosureCount = 0;
    this.isCharInsideQuotes = false;
    this.isCharEscaped = false;
    this.chunkBuffer = "";
  }

  private stringElementParser(char: string, filter?: (element: T) => boolean) {
    this.chunkBuffer = `${this.chunkBuffer}${char}`;

    if (char === CHARACTER.QUOTE) {
      if (this.isCharInsideQuotes && !this.isCharEscaped) {
        const element = <T>this.getParsedElement();
        this.addToResult(element, filter);
        this.resetParser();
      } else if (this.chunkBuffer === CHARACTER.QUOTE) {
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

  private primitiveElementParser(
    char: string,
    filter?: (element: T) => boolean
  ) {
    if (char === CHARACTER.COMMA) {
      const element = <T>this.getParsedElement();
      this.addToResult(element, filter);
      this.resetParser();
    } else {
      this.chunkBuffer = `${this.chunkBuffer}${char}`;
    }
  }

  private containerElementParser(
    char: string,
    filter?: (element: T) => boolean
  ) {
    const ENCLOSURE =
      this.elementType === "array" ? CHARACTER.BRACKET : CHARACTER.BRACE;

    if (char === ENCLOSURE.OPEN && !this.isCharInsideQuotes) {
      this.chunkBuffer = `${this.chunkBuffer}${char}`;
      this.elementEnclosureCount += 1;
    } else if (char === ENCLOSURE.CLOSE && !this.isCharInsideQuotes) {
      this.chunkBuffer = `${this.chunkBuffer}${char}`;
      this.elementEnclosureCount -= 1;

      if (this.elementEnclosureCount === 0) {
        const element = <T>this.getParsedElement();
        this.addToResult(element, filter);
        this.resetParser();
      }
    } else if (this.chunkBuffer.length) {
      this.chunkBuffer = `${this.chunkBuffer}${char}`;

      if (char === CHARACTER.ESCAPE) {
        this.isCharEscaped = !this.isCharEscaped;
      } else if (char === CHARACTER.QUOTE && !this.isCharEscaped) {
        this.isCharInsideQuotes = !this.isCharInsideQuotes;
      } else if (this.isCharEscaped) {
        this.isCharEscaped = false;
      }
    }
  }

  public async *stream(chunkSize: number, filter?: (element: T) => boolean) {
    characterStream: for await (const chunk of this.chunkGenerator()) {
      for (let char of chunk) {
        if (!this.rootDetected) {
          if (
            ![
              CHARACTER.SPACE,
              CHARACTER.NEW_LINE,
              CHARACTER.BRACKET.OPEN,
            ].includes(char)
          )
            throw new Error(ERRORS.INVALID_FILE);

          this.rootDetected = char === CHARACTER.BRACKET.OPEN;
          continue;
        }

        if (!this.elementDetected) {
          if (char === CHARACTER.BRACKET.CLOSE) break characterStream;

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
              this.elementParser = this.containerElementParser;
            } else if (char === CHARACTER.BRACE.OPEN) {
              this.elementType = "object";
              this.elementParser = this.containerElementParser;
            } else if (char === CHARACTER.QUOTE) {
              this.elementType = "string";
              this.elementParser = this.stringElementParser;
            } else {
              this.elementType = "others";
              this.elementParser = this.primitiveElementParser;
            }
          } else if (
            this.elementParser === this.primitiveElementParser &&
            char === CHARACTER.BRACKET.CLOSE
          ) {
            break characterStream;
          }

          this.elementParser(char, filter);

          if (this.resultBuffer.length === chunkSize) {
            if (!this.readStream?.closed) this.readStream?.pause();
            yield this.resultBuffer.splice(0, chunkSize);
            if (!this.readStream?.closed) this.readStream?.resume();
          }
        }
      }
    }

    this.readStream?.close();
    this.readStream = null;

    if (this.chunkBuffer.length) {
      const element = <T>this.getParsedElement();
      this.addToResult(element, filter);
      this.resetParser();
    }
    if (this.resultBuffer.length) {
      yield this.resultBuffer.splice(0);
    }

    return this.resultBuffer;
  }

  private static sanitizeReadStreamOptions = (
    options?: Record<string, any>
  ) => {
    const sanitizedOptions = { ...(options || {}) };
    if (!sanitizedOptions.encoding) {
      sanitizedOptions.encoding = "utf-8";
    }
    Object.keys(sanitizedOptions).forEach((key) => {
      if (!["signal", "encoding", "highWatermark"].includes(key)) {
        delete sanitizedOptions[key];
      }
    });

    return sanitizedOptions as ReadStreamOptions;
  };

  public static create = async <T>(
    path: string,
    options?: ReadStreamOptions
  ) => {
    const instance = new JsonArrayStreamer<T>(path, options);
    await once(instance.readStream!, "readable");
    return instance;
  };
}

export default JsonArrayStreamer;
