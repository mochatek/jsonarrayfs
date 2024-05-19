import { createReadStream } from "fs";
import { once } from "events";

type BufferEncoding =
  | "ascii"
  | "utf8"
  | "utf-8"
  | "utf16le"
  | "utf-16le"
  | "ucs2"
  | "ucs-2"
  | "base64"
  | "base64url"
  | "latin1"
  | "binary"
  | "hex";

type ReadStreamOptions = {
  encoding?: BufferEncoding;
  highWaterMark?: number;
  signal?: AbortSignal;
};

type ElementType = "array" | "object";

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
};

async function createReadableFileStream(
  path: string,
  options?: ReadStreamOptions
) {
  if (!options) {
    options = {};
  }
  if (!options.encoding) {
    options.encoding = "utf-8";
  }

  const stream = createReadStream(path, options);
  await once(stream, "readable");

  const chunkGenerator = async function* () {
    for await (const chunk of stream) {
      yield chunk;
    }
  };

  return { stream, chunkGenerator };
}

async function createJsonChunkStream<T extends any[] | Record<any, any>>(
  path: string,
  elementType: ElementType,
  options?: ReadStreamOptions
) {
  const { stream, chunkGenerator } = await createReadableFileStream(
    path,
    options
  );
  const ELEMENT_WRAPPER =
    elementType === "object" ? CHARACTER.BRACE : CHARACTER.BRACKET;

  return async function* (chunkSize: number) {
    let rootDetected = false;
    let elementWrapperCount = 0;
    let insideQuotes = false;
    let isEscaped = false;
    let chunkBuffer = "";
    let resultBuffer: T[] = [];

    readChunks: for await (const chunk of chunkGenerator()) {
      for (let char of chunk) {
        if (char === CHARACTER.BRACKET.OPEN && !rootDetected) {
          rootDetected = true;
          continue;
        } else if (char === CHARACTER.BRACKET.CLOSE && !elementWrapperCount) {
          if (!resultBuffer.length) break readChunks;

          yield resultBuffer.splice(0, chunkSize);
        } else if (char === ELEMENT_WRAPPER.OPEN && !insideQuotes) {
          chunkBuffer = `${chunkBuffer}${char}`;
          elementWrapperCount += 1;
        } else if (char === ELEMENT_WRAPPER.CLOSE && !insideQuotes) {
          chunkBuffer = `${chunkBuffer}${char}`;
          elementWrapperCount -= 1;

          if (elementWrapperCount === 0) {
            const element: T = JSON.parse(chunkBuffer);
            resultBuffer.push(element);
            chunkBuffer = "";

            if (resultBuffer.length === chunkSize) {
              if (!stream.closed) stream.pause();
              yield resultBuffer.splice(0, chunkSize);
              if (!stream.closed) stream.resume();
            }
          }
        } else if (chunkBuffer.length) {
          chunkBuffer = `${chunkBuffer}${char}`;

          if (char === CHARACTER.ESCAPE) {
            isEscaped = !isEscaped;
          } else if (char === CHARACTER.QUOTE && !isEscaped) {
            insideQuotes = !insideQuotes;
          } else if (isEscaped) {
            isEscaped = false;
          }
        }
      }
    }

    await stream.close();
    return resultBuffer;
  };
}

export { createJsonChunkStream as createReadStream };
