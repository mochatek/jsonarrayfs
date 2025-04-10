import { test } from "node:test";
import { strict as assert } from "node:assert/strict";
import { Readable } from "node:stream";
import { JsonArrayStream } from "../src";
import { ERRORS } from "../src/utils/constants";
import { ENCODING, IStreamTestCase, collectElements } from "./utils";

// Test cases for whitespace handling
const whitespaceTests: IStreamTestCase[] = [
  {
    name: "Empty array",
    input: JSON.stringify([]),
    expected: [],
  },
  {
    name: "Array with spaces between elements",
    input: JSON.stringify([1, 2, 3], null, 1),
    expected: [1, 2, 3],
  },
  {
    name: "Array with tabs between elements",
    input: JSON.stringify([1, 2, 3], null, "\t"),
    expected: [1, 2, 3],
  },
  {
    name: "Array with newlines between elements",
    input: JSON.stringify([1, 2, 3], null, "\n"),
    expected: [1, 2, 3],
  },
  {
    name: "Array with mixed whitespace",
    input: JSON.stringify([1, 2, 3], null, "\n\t"),
    expected: [1, 2, 3],
  },
];

// Test cases for different data types
const dataTypeTests: IStreamTestCase[] = [
  {
    name: "String elements",
    input: JSON.stringify(["", "hello", "world"]),
    expected: ["", "hello", "world"],
  },
  {
    name: "String elements with escapes",
    input: JSON.stringify(["\n", '"quoted"', "path\to\file"]),
    expected: ["\n", '"quoted"', "path\to\file"],
  },
  {
    name: "String elements with unicode",
    input: JSON.stringify(["\u0041", "\u{1F600}"]),
    expected: ["\u0041", "\u{1F600}"],
  },
  {
    name: "Number elements",
    input: JSON.stringify([0, -1, 3.14, 1e10, -2.5e-5]),
    expected: [0, -1, 3.14, 1e10, -2.5e-5],
  },
  {
    name: "Boolean and null elements",
    input: JSON.stringify([true, false, null]),
    expected: [true, false, null],
  },
  {
    name: "Array elements",
    input: JSON.stringify([[1, 2], [], [3, [4, 5]]]),
    expected: [[1, 2], [], [3, [4, 5]]],
  },
  {
    name: "Object elements",
    input: JSON.stringify([{}, { a: 1 }, { b: { c: 3 } }]),
    expected: [{}, { a: 1 }, { b: { c: 3 } }],
  },
];

// Test cases for edge cases and error handling
const edgeCaseTests: IStreamTestCase[] = [
  {
    name: "Single element array",
    input: JSON.stringify([42]),
    expected: [42],
  },
  {
    name: "Large nested structure",
    input: JSON.stringify([
      { a: Array(100).fill(1) },
      Array(100).fill({ b: 2 }),
    ]),
    expected: [{ a: Array(100).fill(1) }, Array(100).fill({ b: 2 })],
  },
  {
    name: "Array with all JSON types",
    input: JSON.stringify(["", 0, true, null, [], {}]),
    expected: ["", 0, true, null, [], {}],
  },
];

// Test cases for error handling
const errorTests: IStreamTestCase[] = [
  {
    name: "Invalid JSON - missing bracket",
    input: "[1, 2, 3",
    expected: ERRORS.INVALID_JSON_ARRAY,
  },
  {
    name: "Invalid JSON - not an array",
    input: '{"a": 1}',
    expected: ERRORS.NOT_AN_ARRAY,
  },
  {
    name: "Invalid JSON - invalid element (undefined)",
    input: "[undefined]",
    expected: ERRORS.INVALID_ELEMENT("undefined"),
  },
  {
    name: "Invalid JSON - missing element (empty element in start)",
    input: "[ , ]",
    expected: ERRORS.TRAILING_COMMA,
  },
  {
    name: "Invalid JSON - missing element (empty element in end)",
    input: "[ 1, ]",
    expected: ERRORS.TRAILING_COMMA,
  },
  {
    name: "Invalid JSON - missing element (empty element in between)",
    input: "[ 1, , 3 ]",
    expected: ERRORS.MISSING_ELEMENT,
  },
];

const runTests = async () => {
  // Test whitespace handling
  await test("Whitespace handling", async (t) => {
    for (const testCase of whitespaceTests) {
      await t.test(testCase.name, async () => {
        const stream = Readable.from(Buffer.from(testCase.input));
        const parser = new JsonArrayStream(ENCODING);
        const result = await collectElements(stream.pipe(parser));
        assert.deepStrictEqual(result, testCase.expected);
      });
    }
  });

  // Test data types
  await test("Data types", async (t) => {
    for (const testCase of dataTypeTests) {
      await t.test(testCase.name, async () => {
        const stream = Readable.from(Buffer.from(testCase.input));
        const parser = new JsonArrayStream(ENCODING);
        const result = await collectElements(stream.pipe(parser));
        assert.deepStrictEqual(result, testCase.expected);
      });
    }
  });

  // Test edge cases
  await test("Edge cases", async (t) => {
    for (const testCase of edgeCaseTests) {
      await t.test(testCase.name, async () => {
        const stream = Readable.from(Buffer.from(testCase.input));
        const parser = new JsonArrayStream(ENCODING);
        const result = await collectElements(stream.pipe(parser));
        assert.deepStrictEqual(result, testCase.expected);
      });
    }
  });

  // Test error cases
  await test("Error cases", async (t) => {
    for (const testCase of errorTests) {
      await t.test(testCase.name, async () => {
        const stream = Readable.from(Buffer.from(testCase.input));
        const parser = new JsonArrayStream(ENCODING);
        await assert.rejects(
          async () => {
            await collectElements(stream.pipe(parser));
          },
          (error: any) => {
            assert(error.message.includes(testCase.expected));
            return true;
          },
        );
      });
    }
  });
};

export default runTests;
