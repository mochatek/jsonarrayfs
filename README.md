# jsonarrayfs <img src="https://img.shields.io/npm/dm/jsonarrayfs" />

jsonarrayfs is a Node.js library designed to facilitate efficient handling of JSON array data stored in files. It offers functionality for streaming JSON array elements in batches, allowing for reduced memory consumption when working with large datasets. Additionally, jsonarrayfs provides a method for appending new data to existing JSON array files without loading the entire dataset into memory.

## Installation

To install jsonarrayfs, use:

```sh
npm install jsonarrayfs
```

## Features

- Stream JSON array elements:

```js
import { createReadStream } from "jsonarrayfs";

// Create a streamer to read JSON array elements from a file
const streamer = await createReadStream("./data.json");

// Stream JSON array elements in batches of 100
for await (const chunk of streamer.stream(100)) {
  // Your processing logic here
}
```

- Append data to existing JSON array:

```js
import { appendFile } from "jsonarrayfs";

// Simulate new data to append
const newData = [
  { id: 1, name: "JavaScript" },
  { id: 2, name: "Go" }
];

// Append new data to the existing JSON array file
await appendFile("./data.json", ...newData);
```

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

[MIT License ](https://github.com/mochatek/jsonarrayfs/blob/main/LICENSE)