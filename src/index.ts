import { ReadStream, createReadStream } from "fs";
import { once } from "events";
import { ElementType, ReadStreamOptions } from "./index.types";
import { CHARACTER } from "./constants";

class JsonArrayStreamer<T> {
  private readStream: ReadStream | null;
  private rootDetected: boolean;
  private elementDetected: boolean;
  private elementType: ElementType;
  private elementParser: ((char: string) => void) | null;
  private elementEnclosureCount: number;
  private isCharInsideQuotes: boolean;
  private isCharEscaped: boolean;
  private chunkBuffer: string;
  private resultBuffer: T[];

  private constructor() {
    this.readStream = null;
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

  private resetParser() {
    this.elementDetected = false;
    this.elementType = "others";
    this.elementParser = null;
    this.elementEnclosureCount = 0;
    this.isCharInsideQuotes = false;
    this.isCharEscaped = false;
    this.chunkBuffer = "";
  }

  private stringElementParser(char: string) {
    this.chunkBuffer = `${this.chunkBuffer}${char}`;

    if (char === CHARACTER.QUOTE) {
      if (this.isCharInsideQuotes && !this.isCharEscaped) {
        const element: T = JSON.parse(this.chunkBuffer);
        this.resultBuffer.push(element);
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

  private primitiveElementParser(char: string) {
    if ([CHARACTER.COMMA, CHARACTER.BRACKET.CLOSE].includes(char)) {
      const element: T = JSON.parse(this.chunkBuffer);
      this.resultBuffer.push(element);
      this.resetParser();
    } else {
      this.chunkBuffer = `${this.chunkBuffer}${char}`;
    }
  }

  private containerElementParser(char: string) {
    const ENCLOSURE =
      this.elementType === "array" ? CHARACTER.BRACKET : CHARACTER.BRACE;

    if (char === ENCLOSURE.OPEN && !this.isCharInsideQuotes) {
      this.chunkBuffer = `${this.chunkBuffer}${char}`;
      this.elementEnclosureCount += 1;
    } else if (char === ENCLOSURE.CLOSE && !this.isCharInsideQuotes) {
      this.chunkBuffer = `${this.chunkBuffer}${char}`;
      this.elementEnclosureCount -= 1;

      if (this.elementEnclosureCount === 0) {
        const element: T = JSON.parse(this.chunkBuffer);
        this.resultBuffer.push(element);
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

  public async *stream<T>(chunkSize: number) {
    for await (const chunk of this.chunkGenerator()) {
      for (let char of chunk) {
        if (!this.rootDetected) {
          this.rootDetected = char === CHARACTER.BRACKET.OPEN;
          continue;
        }

        if (!this.elementDetected) {
          this.elementDetected = ![
            CHARACTER.SPACE,
            CHARACTER.COMMA,
            CHARACTER.NEW_LINE,
            CHARACTER.BRACKET.CLOSE,
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
          }

          this.elementParser(char);

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
      const element = JSON.parse(this.chunkBuffer);
      this.resultBuffer.push(element);
      this.resetParser();
    }
    if (this.resultBuffer.length) {
      yield this.resultBuffer.splice(0);
    }

    return this.resultBuffer;
  }

  private static getReadableFileStream = (
    path: string,
    options?: ReadStreamOptions
  ) => {
    if (!options) {
      options = {};
    }
    if (!options.encoding) {
      options.encoding = "utf-8";
    }

    const readStream = createReadStream(path, options);
    return readStream;
  };

  public static create = async <T>(
    path: string,
    options?: ReadStreamOptions
  ) => {
    const instance = new JsonArrayStreamer<T>();
    instance.readStream = JsonArrayStreamer.getReadableFileStream(
      path,
      options
    );
    await once(instance.readStream, "readable");
    return instance;
  };
}

export { JsonArrayStreamer };
