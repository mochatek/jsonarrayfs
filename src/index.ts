import JsonArrayStreamer from "./modules/JsonArrayStreamer";
import Transform from "./modules/JsonArrayTransformer";
import appendFile from "./modules/JsonArrayAppend";

const createReadStream = JsonArrayStreamer.create;

export { createReadStream, appendFile, Transform };
