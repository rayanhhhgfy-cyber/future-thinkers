import api from "./api";

// Files bigger than this go through the chunked/resumable upload flow
// (POST /api/uploads/start -> /part x N -> /complete) so large PDFs
// survive the serverless request-body limit. Smaller files keep the
// original single-request upload.
export const CHUNK_THRESHOLD = 3 * 1024 * 1024;
export const MAX_PDF_SIZE = 100 * 1024 * 1024; // 100MB
// Covers ride inside the same request as the book (FormData or the chunked
// /complete JSON call), so a multi-MB phone photo would blow Vercel's 4.5MB
// serverless body limit (HTTP 413). Compress covers in the browser first.
export const MAX_COVER_BYTES = 400 * 1024;

export async function startChunkedUpload(file) {
  const { data } = await api.post("/uploads/start", {
    filename: file.name,
    content_type: file.type || "application/pdf",
    size: file.size,
  });
  return data; // { upload_id, chunk_size, total_parts }
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result || "");
      const comma = url.indexOf(",");
      resolve(comma >= 0 ? url.slice(comma + 1) : "");
    };
    reader.onerror = () => reject(new Error("تعذر قراءة الملف"));
    reader.readAsDataURL(blob);
  });
}

export async function uploadChunks(file, upload_id, chunk_size, total_parts, onProgress) {
  for (let i = 0; i < total_parts; i++) {
    const chunk = file.slice(i * chunk_size, (i + 1) * chunk_size);
    const data = await blobToBase64(chunk);
    await api.post("/uploads/part", { upload_id, index: i, data });
    if (onProgress) onProgress(i + 1, total_parts);
  }
}

export async function completeChunkedUpload(upload_id, purpose, params) {
  const { data } = await api.post("/uploads/complete", { upload_id, purpose, ...params });
  return data;
}

// Downscale a cover image so it stays well under the serverless body limit.
// Returns the original file when it's already small or can't be processed.
export function compressCoverImage(file, maxDim = 1024, quality = 0.82) {
  return new Promise((resolve) => {
    if (!file || !String(file.type || "").startsWith("image/") || file.size <= MAX_COVER_BYTES) {
      return resolve(file);
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob((blob) => {
          if (blob && blob.size < file.size) {
            resolve(new File([blob], String(file.name || "cover").replace(/\.\w+$/, "") + ".jpg",
              { type: "image/jpeg" }));
          } else resolve(file);
        }, "image/jpeg", quality);
      } catch { resolve(file); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

// Reads a small file (e.g. a compressed cover image) fully into base64 + its mime type.
export async function fileToBase64(file) {
  const b64 = await blobToBase64(file);
  return { b64, type: file.type || "image/jpeg" };
}
