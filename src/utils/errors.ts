class JsonArrayStreamError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JsonArrayStreamError";
  }
}

class JsonArrayAppendError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JsonArrayAppendError";
  }
}

export { JsonArrayStreamError, JsonArrayAppendError };
