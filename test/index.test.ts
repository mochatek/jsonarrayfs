import { test } from "node:test";

test("Tests", async (t) => {
  await t.test("JsonArrayStream", async () => {
    const { default: runTests } = await import("./JsonArrayStream.test");
    await runTests();
  });

  await t.test("JsonArrayAppend", async () => {
    const { default: runTests } = await import("./JsonArrayAppend.test");
    await runTests();
  });
});
