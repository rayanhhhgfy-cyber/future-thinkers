import api from "./api";

// Files bigger than this go through the chunked/resumable upload flow
// (POST /api/uploads/start -> /part x N -> /complete) so large PDFs
// survive the serverless request-body limit. Smaller files keep the
// original single-request upload.
export const CHUNK_THRESHOLD = 4 * 1024 * 1024;
export const MAX_PDF_SIZE = 100 * 1024 * 1024; // 100MB

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

// Reads a small file (e.g. a cover image) fully into base64 + its mime type.
export async function fileToBase64(file) {
  const b64 = await blobToBase64(file);
  return { b64, type: file.type || "image/jpeg" };
}
