# jsonarrayfs <img alt="NPM Version" src="https://img.shields.io/npm/v/jsonarrayfs"> <img alt="Monthly Downloads" src="https://img.shields.io/npm/dm/jsonarrayfs" /> <img alt="GitHub Actions Workflow Status" src="https://img.shields.io/github/actions/workflow/status/mochatek/jsonarrayfs/publish-to-npm.yml">

"jsonarrayfs" is a Node.js library crafted for robust and memory-efficient management of massive JSON array files. It enables seamless handling of JSON arrays without the need to load the entire file into memory, making it perfect for efficiently managing large datasets without overwhelming system resources.

## 🎯 Key Features

- **Stream Processing**: Read JSON array in manageable chunks (eg: 50k elements at a time) using stream.
- **On-the-Fly Filtering**: Apply filter to the stream to fetch only relevant data, reducing the data you handle even further.
- **Direct Appends**: Append new elements directly to the JSON array file, avoiding unnecessary loading, modification and rewriting.
- **Formatting Flexibility**: Works regardless of whether the JSON file is formatted with proper indentation or not.
- **Handles Mixed Types**: Can handle JSON arrays containing both uniform and mixed types of elements.

## 💡 Benefits

- **Memory Optimization**: Process JSON array files with minimal memory usage, making it ideal for resource-constrained environments.
- **Handles Large Datasets**: Efficiently manage massive JSON array files without memory limitations.
- **Improved Performance**: Faster processing times due to efficient streaming, filtering and appending capabilities.
- **Enhanced Scalability**: Scales seamlessly with growing datasets, ensuring smooth performance.

## ⚙️ Installation

To install jsonarrayfs, use:

```sh
npm install jsonarrayfs
```

## 🚀 Usage

- Stream Processing:

```ts
import { createReadStream } from "jsonarrayfs";

// Option 1: Create a streamer to read JSON array elements from a file
const streamer = await createReadStream("./data.json", { encoding: "utf-8" });

// Option 2: Create a streamer to read JSON array elements from an existing Readable:

// From a file
import fs from "fs";
const readStream = fs.createReadStream("./data.json", { encoding: "utf-8" });
const streamer = await createReadStream(readStream);

// From an API response
import { ReadableStream } from "stream/web";
import { Readable } from "stream";
const response = await fetch("https://www.example.com/json-data");
const readableStream = Readable.fromWeb(
  response.body as unknown as ReadableStream,
);
const streamer = await createReadStream(readableStream);

// Stream JSON array elements in batches of 100
for await (const elements of streamer.batch(100)) {
  // Your processing logic here
}
```

- On-the-Fly Filtering:

```ts
import { createReadStream } from "jsonarrayfs";

const streamer = await createReadStream<{ offer: boolean; price: number }>(
  "./data.json",
  { encoding: "utf-8" },
);

// Add filter to the batch to fetch only relevant elements
for await (const elements of streamer.batch(
  100,
  (element) => element.price < 500 || element.offer,
)) {
  // Your processing logic here
}
```

- Append data to existing JSON array:

```ts
import { appendFile } from "jsonarrayfs";

// Simulate new data to append
const newData = [
  { id: 1, name: "Earth", price: 1000, offer: true },
  { id: 2, name: "Moon", price: 500, offer: false },
];

// Append new data to the existing JSON array file
await appendFile("./data.json", "utf-8", ...newData);
```

## 🤝 Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## 📜 License

[MIT License ](https://github.com/mochatek/jsonarrayfs/blob/main/LICENSE)
