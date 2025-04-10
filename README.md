# jsonarrayfs

[![npm version](https://img.shields.io/npm/v/jsonarrayfs.svg)](https://www.npmjs.com/package/jsonarrayfs)
[![npm downloads](https://img.shields.io/npm/dm/jsonarrayfs.svg)](https://www.npmjs.com/package/jsonarrayfs)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![Coverage](https://img.shields.io/badge/coverage-96.88%25-brightgreen)

Specialized Node.js library for memory-efficient operations on JSON array files. Stream individual elements from large JSON array files and append new elements without loading the entire array into memory. Perfect for processing large-scale JSON array datasets without memory limitations.

## Why Use This?

- 🎯 **Specialized**: Purpose-built for JSON array files
- 💾 **Memory Efficient**: Process arrays of any size without loading them entirely
- ⚡ **High Performance**: Optimized streaming and batch operations
- ✍️ **Direct Updates**: Append elements without rewriting the entire file
- 🔄 **Format Agnostic**: Works with any valid JSON array structure

## Installation

```bash
npm install jsonarrayfs
```

## Usage

```typescript
import { JsonArrayStream, appendToJsonArrayFile } from "jsonarrayfs";
import { createReadStream } from "node:fs";
import { Transform } from "node:stream";

// Process a large application log file (10GB+ JSON array)
const fileStream = createReadStream("app.log.json");
const arrayStream = new JsonArrayStream("utf8");

// Analyze logs: Count errors and slow responses
let errorCount = 0;
let slowResponses = 0;

for await (const log of fileStream.pipe(arrayStream)) {
  if (log !== JsonArrayStream.NULL) {
    if (log.level === "error") {
      errorCount++;
      console.error(`Error in ${log.service}: ${log.message}`);
    }

    if (log.responseTime > 1000) {
      slowResponses++;
      console.warn(`Slow response: ${log.path} (${log.responseTime}ms)`);
    }
  }
}

console.log(
  `Analysis complete: ${errorCount} errors, ${slowResponses} slow responses`,
);

// Append new log entries
const newLogs = [
  {
    timestamp: Date.now(),
    level: "info",
    service: "auth",
    path: "/api/login",
    responseTime: 245,
    message: "User login successful",
  },
  {
    timestamp: Date.now(),
    level: "info",
    service: "auth",
    path: "/api/login",
    responseTime: 1245,
    message: "User login successful",
  },
  null,
  {
    timestamp: Date.now(),
    level: "error",
    service: "payment",
    path: "/api/checkout",
    responseTime: 1532,
    message: "Database connection timeout",
  },
];

await appendToJsonArrayFile("app.log.json", "utf8", ...newLogs);
```

## API

### JsonArrayStream

A transform stream that reads JSON array files and emits elements one by one for efficient processing. When processing arrays containing `null` values, it uses a special sentinel value (`JsonArrayStream.NULL`) to distinguish between JSON `null` and stream EOF.

#### Constructor

```typescript
new JsonArrayStream(encoding?: string)
```

##### Parameters

- `encoding` (string, optional): File encoding (default: 'utf8')

#### Properties

- `JsonArrayStream.NULL`: Special sentinel value to distinguish between JSON `null` and stream EOF

#### Events

- `data`: Emitted for each array element
- `error`: Emitted when parsing fails or input is invalid

### appendToJsonArrayFile

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
