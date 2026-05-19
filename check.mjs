import { Story } from "inkjs";
import { readFileSync } from "fs";
const raw = readFileSync("./test7.ink.json", "utf-8");
const json = JSON.parse(raw.replace(/^\uFEFF/, ""));
const s = new Story(json);
s.BindExternalFunction("test_fn", (x) => x * 2);
try {
  s.BindExternalFunction("test_fn", (x) => x * 3);
  console.log("rebind succeeded");
} catch (e) {
  console.log("rebind failed:", e.message);
}
console.log(s.Continue());
