import { createReadStream } from "fs";
import { once } from "events";

type ReadStreamOptions = {
  signal?: AbortSignal;
  highWaterMark?: number;
};

const BRACKET = {
  OPEN: "[",
  CLOSED: "]",
};

async function createDataStream(path: string, options?: ReadStreamOptions) {
  const stream = createReadStream(path, options);
  await once(stream, "readable");

  const getChunk = async function* () {
    for await (const chunk of stream) {
      yield chunk;
    }
  };

  return { stream, getChunk };
}

async function createJsonStream<T extends any[]>(
  path: string,
  options?: ReadStreamOptions
) {
  const { stream, getChunk } = await createDataStream(path, options);

  return async function* (chunkSize: number) {
    let rootDetected = false;
    let bracketCount = 0;
    let chunkBuffer = "";
    let resultBuffer: T[] = [];

    for await (const chunk of getChunk()) {
      for (let i = 0; i < chunk.length; i++) {
        const char = String.fromCharCode(chunk[i]);

        if (char === BRACKET.OPEN) {
          if (!rootDetected) {
            rootDetected = true;
            continue;
          } else {
            chunkBuffer = `${chunkBuffer}${char}`;
            bracketCount += 1;
          }
        } else if (char === BRACKET.CLOSED) {
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
        }
      }
    }

    await stream.close();
    return resultBuffer;
  };
}

export { createJsonStream as createReadStream };
