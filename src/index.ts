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

const CHARACTER = {
  OPEN_BRACKET: `[`,
  CLOSE_BRACKET: `]`,
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

async function createJsonChunkStream<T extends any[]>(
  path: string,
  options?: ReadStreamOptions
) {
  const { stream, chunkGenerator } = await createReadableFileStream(
    path,
    options
  );

  return async function* (chunkSize: number) {
    let rootDetected = false;
    let bracketCount = 0;
    let insideQuotes = false;
    let isEscaped = false;
    let chunkBuffer = "";
    let resultBuffer: T[] = [];

    for await (const chunk of chunkGenerator()) {
      for (let char of chunk) {
        if (char === CHARACTER.OPEN_BRACKET && !insideQuotes) {
          if (!rootDetected) {
            rootDetected = true;
            continue;
          } else {
            chunkBuffer = `${chunkBuffer}${char}`;
            bracketCount += 1;
          }
        } else if (char === CHARACTER.CLOSE_BRACKET && !insideQuotes) {
          chunkBuffer = `${chunkBuffer}${char}`;
          bracketCount -= 1;

          if (bracketCount < 0) {
            if (!resultBuffer.length) break;

            yield resultBuffer;
            resultBuffer = [];
          } else if (bracketCount === 0) {
            const subArray: T = JSON.parse(chunkBuffer);
            resultBuffer.push(subArray);
            chunkBuffer = "";

            if (resultBuffer.length === chunkSize) {
              if (!stream.closed) stream.pause();

              yield resultBuffer;
              resultBuffer = [];
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
