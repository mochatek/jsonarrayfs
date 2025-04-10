import { test } from "node:test";
import { strict as assert } from "node:assert/strict";
import { writeFile, readFile } from "node:fs/promises";
import { ERRORS } from "../src/utils/constants";
import appendToJsonArrayFile from "../src/modules/JsonArrayAppend";
import { cleanupFile, ENCODING, getTestFile, IAppendTestCase } from "./utils";

// Test cases for basic operations
const basicTests: IAppendTestCase[] = [
  {
    name: "should create new array file when file doesn't exist",
    appendData: [1, "test", { key: "value" }],
    expected: [1, "test", { key: "value" }],
  },
  {
    name: "should append to empty array",
    initialContent: JSON.stringify([]),
    appendData: [1, 2, 3],
    expected: [1, 2, 3],
  },
  {
    name: "should append to existing array with elements",
    initialContent: JSON.stringify([1, 2, 3]),
    appendData: [4, 5],
    expected: [1, 2, 3, 4, 5],
  },
];

// Test cases for whitespace handling
const whitespaceTests: IAppendTestCase[] = [
  {
    name: "should handle array with whitespace",
    initialContent: JSON.stringify([1, 2, 3], null, 2),
    appendData: [4],
    expected: [1, 2, 3, 4],
  },
  {
    name: "should handle array with multiple lines",
    initialContent: JSON.stringify([1, 2, 3], null, 2),
    appendData: [4],
    expected: [1, 2, 3, 4],
  },
];

// Test cases for complex data types
const complexTests: IAppendTestCase[] = [
  {
    name: "should handle complex objects",
    initialContent: JSON.stringify([]),
    appendData: [
      {
        nested: {
          array: [1, 2, 3],
          object: { key: "value" },
        },
        date: new Date("2025-01-01").toISOString(),
      },
    ],
    expected: [
      {
        nested: {
          array: [1, 2, 3],
          object: { key: "value" },
        },
        date: new Date("2025-01-01").toISOString(),
      },
    ],
  },
];

// Test cases for error handling
const errorTests: IAppendTestCase[] = [
  {
    name: "should throw error for invalid JSON array",
    initialContent: "[1,2,3", // Missing closing bracket
    appendData: [4],
    expected: [],
    shouldThrow: true,
    expectedError: ERRORS.INVALID_JSON_ARRAY,
  },
];

// Test cases for edge cases
const edgeCaseTests: IAppendTestCase[] = [
  {
    name: "should handle multiple append operations",
    initialContent: JSON.stringify([1]),
    appendData: [2, 3, 4],
    expected: [1, 2, 3, 4],
  },
  {
    name: "should handle empty array elements",
    initialContent: JSON.stringify([1, 2, 3]),
    appendData: [],
    expected: [1, 2, 3],
  },
];

const runTests = async () => {
  // Helper function to run a test case
  const runTestCase = async (t: any, testCase: IAppendTestCase) => {
    const testFile = getTestFile(testCase.name.replace(/[^a-zA-Z0-9]/g, "_"));
    try {
      if (testCase.initialContent !== undefined) {
        await writeFile(testFile, testCase.initialContent, ENCODING);
      }

      if (testCase.shouldThrow) {
        await assert.rejects(
          async () => {
            await appendToJsonArrayFile(
              testFile,
              ENCODING,
              ...testCase.appendData,
            );
          },
          (error: Error) => {
            assert.ok(error.message.includes(testCase.expectedError!));
            return true;
          },
        );
      } else {
        await appendToJsonArrayFile(testFile, ENCODING, ...testCase.appendData);
        const content = await readFile(testFile, ENCODING);
        assert.deepStrictEqual(
          JSON.parse(content.toString()),
          testCase.expected,
        );
      }
    } finally {
      await cleanupFile(testFile);
    }
  };

  // Basic Operations
  await test("Basic Operations", async (t) => {
    for (const testCase of basicTests) {
      await t.test(testCase.name, async () => {
        await runTestCase(t, testCase);
      });
    }
  });

  // Whitespace Handling
  await test("Whitespace Handling", async (t) => {
    for (const testCase of whitespaceTests) {
      await t.test(testCase.name, async () => {
        await runTestCase(t, testCase);
      });
    }
  });

  // Complex Data Types
  await test("Complex Data Types", async (t) => {
    for (const testCase of complexTests) {
      await t.test(testCase.name, async () => {
        await runTestCase(t, testCase);
      });
    }
  });

  // Error Handling
  await test("Error Handling", async (t) => {
    for (const testCase of errorTests) {
      await t.test(testCase.name, async () => {
        await runTestCase(t, testCase);
      });
    }
  });

  // Edge Cases
  await test("Edge Cases", async (t) => {
    for (const testCase of edgeCaseTests) {
      await t.test(testCase.name, async () => {
        await runTestCase(t, testCase);
      });
    }
  });
};

export default runTests;
