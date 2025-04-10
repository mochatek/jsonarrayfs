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

interface ParserState<T> {
  encoding: BufferEncoding;
  rootDetected: boolean;
  elementDetected: boolean;
  elementType: "string" | "array" | "object" | "others";
  elementParser: ((char: string) => boolean) | null;
  elementEnclosureCount: number;
  isCharInsideQuotes: boolean;
  isCharEscaped: boolean;
  commaSkipped: boolean;
  buffer: string;
  parsedElements: T[];
}

export { BufferEncoding, ReadStreamOptions, ElementType, ParserState };
