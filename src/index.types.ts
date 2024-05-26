type BufferEncoding =
  | "ascii"
  | "utf8"
  | "utf-8"
  | "utf16le"
  | "utf-16le"
  | "ucs2"
  | "ucs-2"
  | "base64"
  | "base64url"
  | "latin1"
  | "binary"
  | "hex";

type ReadStreamOptions = {
  encoding?: BufferEncoding;
  highWaterMark?: number;
  signal?: AbortSignal;
};

type ElementType = "array" | "object" | "string" | "others";

export { BufferEncoding, ReadStreamOptions, ElementType };
