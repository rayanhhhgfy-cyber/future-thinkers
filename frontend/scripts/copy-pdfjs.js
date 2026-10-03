/* Copy pdf.js runtime assets (lib + worker + cmaps + standard fonts) into
   build/pdfjs so the book reader is 100% same-origin · no CDN dependency.
   Source: node_modules/pdfjs-dist when present, else the pinned npm tarball. */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const VERSION = "6.3.289";
const OUT = path.join(__dirname, "..", "build", "pdfjs");

function findSource() {
  const local = path.join(__dirname, "..", "node_modules", "pdfjs-dist");
  if (fs.existsSync(path.join(local, "build", "pdf.mjs"))) return local;
  const tmp = "/tmp/pdfjs-dist-" + VERSION;
  if (!fs.existsSync(path.join(tmp, "package", "build", "pdf.mjs"))) {
    fs.mkdirSync(tmp, { recursive: true });
    const url = `https://registry.npmjs.org/pdfjs-dist/-/pdfjs-dist-${VERSION}.tgz`;
    execSync(`curl -sL -m 300 -o ${tmp}/pkg.tgz ${url} && tar -xzf ${tmp}/pkg.tgz -C ${tmp}`, { stdio: "inherit" });
  }
  return path.join(tmp, "package");
}

const src = findSource();
fs.mkdirSync(OUT, { recursive: true });
for (const f of ["build/pdf.mjs", "build/pdf.worker.min.mjs"]) {
  fs.copyFileSync(path.join(src, f), path.join(OUT, path.basename(f)));
}
for (const d of ["cmaps", "standard_fonts"]) {
  fs.cpSync(path.join(src, d), path.join(OUT, d), { recursive: true });
}
console.log("pdfjs assets copied to", OUT);
