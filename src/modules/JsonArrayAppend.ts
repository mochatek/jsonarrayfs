import { stat, open, FileHandle } from "fs/promises";
import { CHARACTER, ERRORS } from "../constants";

const appendToJsonArray = async (
  filePath: string,
  encoding: BufferEncoding,
  ...data: any[]
) => {
  let fd: FileHandle | null = null;

  try {
    const { size: fileEnd } = await stat(filePath);
    const charSize = Buffer.byteLength(CHARACTER.BRACKET.CLOSE, encoding);

    const windowSize = Math.min(charSize, fileEnd);
    const window = Buffer.alloc(windowSize);
    let insertPosition = fileEnd;

    fd = await open(filePath, "a+");

    searchForArrayEnd: while (insertPosition) {
      insertPosition -= windowSize;
      await fd.read(window, 0, windowSize, insertPosition);
      const windowValue = window.toString(encoding);

      for (let i = windowValue.length - 1; i >= 0; i--) {
        if (windowValue[i] === CHARACTER.BRACKET.CLOSE) {
          insertPosition +=
            i === 0 ? 0 : Buffer.byteLength(windowValue.slice(0, i), encoding);
          break searchForArrayEnd;
        } else if (
          ![CHARACTER.NEW_LINE, CHARACTER.SPACE].includes(windowValue[i])
        ) {
          throw new Error(ERRORS.INVALID_FILE);
        }
      }
    }

    const remainingDataBuffer = Buffer.alloc(fileEnd - insertPosition);
    await fd.read(
      remainingDataBuffer,
      0,
      remainingDataBuffer.length,
      insertPosition
    );

    let insertData = data.map((datum) => JSON.stringify(datum)).join(",");

    if (insertPosition) {
      let position = insertPosition;

      checkIfArrayHasElements: while (true) {
        position -= windowSize;
        await fd.read(window, 0, windowSize, position);
        const windowValue = window.toString(encoding);

        for (let i = windowValue.length - 1; i >= 0; i--) {
          if (![CHARACTER.NEW_LINE, CHARACTER.SPACE].includes(windowValue[i])) {
            if (windowValue[i] !== CHARACTER.BRACKET.OPEN) {
              insertData = `,${insertData}`;
            }
            break checkIfArrayHasElements;
          }
        }
      }
    } else {
      insertData = `[${insertData}]`;
    }

    const newDataBuffer = Buffer.from(insertData, encoding);
    const writeBuffer = Buffer.alloc(
      newDataBuffer.length + remainingDataBuffer.length
    );
    newDataBuffer.copy(writeBuffer);
    remainingDataBuffer.copy(writeBuffer, newDataBuffer.length);

    await fd.write(writeBuffer, 0, writeBuffer.length, insertPosition);
  } catch (error) {
    throw error;
  } finally {
    await fd?.close();
  }
};

export default appendToJsonArray;
