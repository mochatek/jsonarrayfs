import { unlink } from "node:fs/promises";
import { JsonArrayStream } from "../../src";

interface ITestCaseBase {
  name: string;
  expected: any[] | string;
}

interface IStreamTestCase extends ITestCaseBase {
  input: string;
}

interface IAppendTestCase extends ITestCaseBase {
  initialContent?: string;
  appendData: any[];
  shouldThrow?: boolean;
  expectedError?: string;
}

// Helper function to collect elements from JSON array stream
const collectElements = async <T>(
  stream: NodeJS.ReadableStream,
): Promise<T[]> => {
  const elements: (T | null)[] = [];
  for await (const element of stream) {
    elements.push(
      typeof element === "symbol" && element === JsonArrayStream.NULL
        ? null
        : (element as T),
    );
  }
  return elements as T[];
};

// File cleanup helper
const cleanupFile = async (filePath: string): Promise<void> => {
  try {
    await unlink(filePath);
  } catch (error) {
    // File might not exist, ignore error
  }
};

const getTestFile = (testName: string) => `test_${testName}.json`;

// Test constants
const ENCODING = "utf-8" as const;

export {
  IStreamTestCase,
  IAppendTestCase,
  collectElements,
  cleanupFile,
  getTestFile,
  ENCODING,
};
