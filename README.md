# jsonarrayfs

[![npm version](https://img.shields.io/npm/v/jsonarrayfs.svg)](https://www.npmjs.com/package/jsonarrayfs)
[![npm downloads](https://img.shields.io/npm/dm/jsonarrayfs.svg)](https://www.npmjs.com/package/jsonarrayfs)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![Coverage](https://img.shields.io/badge/coverage-96.88%25-brightgreen)

Specialized Node.js library for memory-efficient operations on JSON arrays. Stream individual elements from large JSON arrays (files, network responses etc.) and append elements to array files without loading the entire array into memory. Perfect for processing large-scale JSON array datasets without memory limitations.

## Why Use This?

- 🎯 **Specialized**: Purpose-built for JSON arrays
- 💾 **Memory Efficient**: Process arrays of any size without loading them entirely
- ⚡ **High Performance**: Optimized streaming and batch operations
- ✍️ **Direct Updates**: Append elements without rewriting the entire file
- 🔄 **Format Agnostic**: Works with any valid JSON array structure

## Installation

```bash
npm install jsonarrayfs
```

## Examples

### 1. Stream from File

Processs a large JSON array file (e.g., application logs) without loading it into memory:

```typescript
import { JsonArrayStream } from "jsonarrayfs";
import { createReadStream } from "node:fs";

// Analyze logs: Count errors and slow responses
const fileStream = createReadStream("app.log.json");
const arrayStream = new JsonArrayStream("utf8");

let errorCount = 0;
let slowResponses = 0;

for await (const log of fileStream.pipe(arrayStream)) {
  if (log !== JsonArrayStream.NULL) {
    if (log.level === "error") errorCount++;
    if (log.responseTime > 1000) slowResponses++;
  }
}

console.log(
  `Analysis complete: Found ${errorCount} errors, ${slowResponses} slow responses`,
);
```

### 2. Stream from Network

Process a JSON array from an API response:

```typescript
import { JsonArrayStream } from "jsonarrayfs";
import { get } from "node:https";

get("https://api.example.com/json-array-data", (res) => {
  const arrayStream = new JsonArrayStream("utf8");

  res.pipe(arrayStream).on("data", (item) => {
    console.log(`Got item: ${item === JsonArrayStream.NULL ? null : item}`);
  });
});
```

### 3. Append to File

Append new elements to an existing JSON array file:

```typescript
import { JsonArrayStream, appendToJsonArrayFile } from "jsonarrayfs";

// Append new log entries
const newLogs = [
  {
    timestamp: Date.now(),
    level: "info",
    message: "User login successful",
    responseTime: 245,
  },
  {
    timestamp: Date.now(),
    level: "info",
    message: "User login successful",
    responseTime: 1245,
  },
  null,
  {
    timestamp: Date.now(),
    level: "error",
    message: "Database connection timeout",
    responseTime: 1532,
  },
];

await appendToJsonArrayFile("app.log.json", "utf8", ...newLogs);
```

## API Reference

### `JsonArrayStream`

A transform stream that parses JSON array elements one by one for efficient processing. When processing arrays containing `null` values, it uses a special sentinel value (`JsonArrayStream.NULL`) to distinguish between JSON `null` and stream EOF.

#### Constructor

```typescript
new JsonArrayStream(encoding?: string)
```

##### Parameters

- `encoding` (string, optional): Content encoding (default: 'utf8')

#### Properties

- `JsonArrayStream.NULL`: Special sentinel value to distinguish between JSON `null` and stream EOF

#### Events

- `data`: Emitted for each array element
- `error`: Emitted when parsing fails or input is invalid

### `appendToJsonArrayFile`

Appends elements to a JSON array file efficiently without loading the entire file into memory.

#### Signature

```typescript
async function appendToJsonArrayFile(
  filePath: string,
  encoding?: string,
  ...elements: any[]
): Promise<void>;
```

#### Parameters

- `filePath` (string): Path to the JSON array file
- `encoding` (string, optional): File encoding (default: 'utf8')
- `...elements` (any[]): Elements to append to the array

#### Returns

Promise that resolves when the append operation is complete.

## Error Handling

The library can throw these errors:

### `JsonArrayStreamError`

- Invalid JSON array format
- Malformed array elements
- Unexpected end of input

### `JsonArrayAppendError`

- Invalid JSON array format
- File system errors
- Permission issues
- Invalid input elements

## Requirements

- Node.js >= 16.0.0
- Input file must be a valid JSON array

## License

MIT License - see the [LICENSE](LICENSE) file for details
