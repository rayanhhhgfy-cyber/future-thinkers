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
for (const d of ["cmaps", "standard_fonts", "wasm"]) {
  fs.cpSync(path.join(src, d), path.join(OUT, d), { recursive: true });
}

/* The worker runs in its own thread, so the app's runtime polyfills never
   reach it · pdf.js 6 calls ES2025 APIs (Map.getOrInsert(Computed),
   Math.sumPrecise, Promise.withResolvers) inside glyph/CFF parsing and
   throws on older browsers, which manifests as missing letters. Bake the
   same polyfills into the copied worker ahead of its own code. */
const POLYFILL_PRELUDE = `;/*ft-polyfills*/
(function(){try{
var inst=function(proto){if(!proto)return;
if(typeof proto.getOrInsertComputed!=="function"){proto.getOrInsertComputed=function(k,fn){if(!this.has(k))this.set(k,fn(k));return this.get(k);};}
if(typeof proto.getOrInsert!=="function"){proto.getOrInsert=function(k,v){if(!this.has(k))this.set(k,v);return this.get(k);};}};
inst(typeof Map!=="undefined"&&Map.prototype);inst(typeof WeakMap!=="undefined"&&WeakMap.prototype);
if(typeof Math.sumPrecise!=="function"){Math.sumPrecise=function(xs){var s=0,c=0,i,t,x;for(i=0;i<xs.length;i++){x=xs[i];t=s+x;c+=Math.abs(s)>=Math.abs(x)?(s-t)+x:(x-t)+s;s=t;}return s+c;};}
if(typeof Promise.withResolvers!=="function"){Promise.withResolvers=function(){var resolve,reject;var promise=new Promise(function(res,rej){resolve=res;reject=rej;});return{promise:promise,resolve:resolve,reject:reject};};}
}catch(e){}})();
`;
const workerOut = path.join(OUT, "pdf.worker.min.mjs");
const workerSrc = fs.readFileSync(workerOut, "utf8");
if (!workerSrc.startsWith(";/*ft-polyfills*/")) {
  fs.writeFileSync(workerOut, POLYFILL_PRELUDE + workerSrc);
}
console.log("pdfjs assets copied to", OUT);
