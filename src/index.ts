import JsonArrayStreamer from "./modules/JsonArrayStreamer";
import appendFile from "./modules/JsonArrayAppend";

const createReadStream = JsonArrayStreamer.create;

export { createReadStream, appendFile };
