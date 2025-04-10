import { stat, open, FileHandle } from "node:fs/promises";
import {
  TOKENS,
  ERRORS,
  WHITESPACE_CHARACTERS,
  APPEND_WINDOW_SIZE,
  APPEND_BATCH_SIZE,
} from "../utils/constants";
import { JsonArrayAppendError } from "../utils/errors";

const writeElements = async (
  fd: FileHandle,
  data: any[],
  encoding: BufferEncoding,
  startPosition: number = 0,
  writeCommaFirst: boolean = false,
): Promise<number> => {
  const COMMA = Buffer.from(",", encoding);
  let position = startPosition;

  if (writeCommaFirst) {
    await fd.write(COMMA, 0, 1, position);
    position++;
  }

  // Process elements in batches
  for (let start = 0; start < data.length; start += APPEND_BATCH_SIZE) {
    const end = Math.min(start + APPEND_BATCH_SIZE, data.length);
    const batch = data.slice(start, end);

    const parts: Buffer[] = [];

    for (let i = 0; i < batch.length; i++) {
      if (start + i > 0) parts.push(COMMA);
      parts.push(Buffer.from(JSON.stringify(batch[i]), encoding));
    }

    const batchBuffer = Buffer.concat(parts);
    await fd.write(batchBuffer, 0, batchBuffer.length, position);
    position += batchBuffer.length;
  }

  return position;
};

const appendToJsonArrayFile = async (
  filePath: string,
  encoding: BufferEncoding,
  ...data: any[]
) => {
  if (data.length === 0) return;

  let fd: FileHandle | null = null;

  try {
    const stats = await stat(filePath).catch((error: any) => {
      if (error.code === "ENOENT") {
        return { size: 0 };
      }
      throw error;
    });

    const fileSize = stats.size;
    if (fileSize === 0) {
      // Empty file, create new array
      fd = await open(filePath, "w+");
      await fd.write(Buffer.from("[", encoding));
      const endPosition = await writeElements(fd, data, encoding, 1);
      await fd.write(Buffer.from("]", encoding), 0, 1, endPosition);
      return;
    }

    fd = await open(filePath, "r+");
    let insertPosition = fileSize;
    let foundArrayEnd = false;
    let hasExistingElements = false;

    // Read file in chunks from end to find array end and check for existing elements
    const buffer = Buffer.alloc(APPEND_WINDOW_SIZE);
    let remainingBytes = fileSize;

    while (remainingBytes > 0 && !foundArrayEnd) {
      const readSize = Math.min(APPEND_WINDOW_SIZE, remainingBytes);
      const position = remainingBytes - readSize;
      await fd.read(buffer, 0, readSize, position);
      const chunk = buffer.toString(encoding, 0, readSize);

      for (let i = readSize - 1; i >= 0; i--) {
        if (!WHITESPACE_CHARACTERS.includes(chunk[i])) {
          if (!foundArrayEnd) {
            if (chunk[i] === TOKENS.BRACKET.CLOSE) {
              foundArrayEnd = true;
              insertPosition = position + i;
            } else {
              throw new JsonArrayAppendError(ERRORS.INVALID_JSON_ARRAY);
            }
          } else if (!hasExistingElements) {
            hasExistingElements = chunk[i] !== TOKENS.BRACKET.OPEN;
            break;
          }
        }
      }

      remainingBytes = position;
    }

    if (!foundArrayEnd) {
      throw new JsonArrayAppendError(ERRORS.INVALID_JSON_ARRAY);
    }

    // Read the remaining content after the insertion point
    const remainingContent = Buffer.alloc(fileSize - insertPosition);
    await fd.read(remainingContent, 0, remainingContent.length, insertPosition);

    // Write elements and get the new position
    const newPosition = await writeElements(
      fd,
      data,
      encoding,
      insertPosition,
      hasExistingElements,
    );

    // Write the remaining content
    await fd.write(remainingContent, 0, remainingContent.length, newPosition);
  } finally {
    await fd?.close();
  }
};

export default appendToJsonArrayFile;
