// Generates PWA icon PNGs from base64 sources at build time.
// Icons are stored as .b64 text in the repo (GitHub text push can't carry
// binary), and decoded here before react-scripts copies public/ -> build/.
const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "..", "public", "icons", "b64");
const outDir = path.join(__dirname, "..", "public", "icons");

if (!fs.existsSync(dir)) {
  console.log("[gen-icons] no b64 icon sources found, skipping");
  process.exit(0);
}

for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith(".b64")) continue;
  const out = path.join(outDir, f.slice(0, -4));
  const data = Buffer.from(fs.readFileSync(path.join(dir, f), "utf8").trim(), "base64");
  fs.writeFileSync(out, data);
  console.log(`[gen-icons] wrote ${path.basename(out)} (${data.length} bytes)`);
}
