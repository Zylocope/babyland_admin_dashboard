import { request } from "./baseService";

const ACCEPTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

// The UploadThing presign flow this file used to implement is gone: the backend
// deleted src/uploadthing.rs and now takes the file directly at POST
// /admin/uploads, streaming it to Supabase Storage itself. There is no presign
// step any more, so calling it 404s.
//
// Auth is the admin SESSION COOKIE, not a bearer token — the route sits inside
// admin_protected_routes behind admin_auth_middleware with
// RequiresRole<SuperAdminRole>, so it is Manager-only. The OpenAPI annotation
// claims bearer; the code does not. request() already sends credentials.
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

// axum's Multipart extractor carries a 2 MB default body limit and the backend
// never raises it, so anything larger fails inside next_field() — which the
// handler reports as a bare 500. Shrinking normally lands far below this, but a
// GIF is passed through untouched and createImageBitmap can fail outright, so
// the ceiling is enforced on whatever is actually about to be sent.
const SERVER_BODY_LIMIT = 2 * 1024 * 1024;

// The server validates nothing. It reads whatever content_type the browser
// sends and streams it straight to Supabase — no format allowlist, no size cap.
// These checks are the only ones there are.
export const validateProductImage = (file: File): "type" | "size" | null => {
  if (!ACCEPTED_IMAGE_TYPES.has(file.type)) return "type";
  if (file.size > MAX_IMAGE_BYTES) return "size";
  return null;
};

const MAX_EDGE = 1600;
const QUALITY = 0.85;

// Downscaling is not a nicety here. The backend runs a global 10-second request
// timeout, and a 4 MB phone photo over a Myanmar mobile connection will not
// finish uploading inside it. A 1600px JPEG lands around 200-400 kB.
//
// GIFs are returned untouched because re-encoding would flatten an animation,
// and anything already small is left byte-for-byte alone.
const shrink = async (file: File): Promise<File> => {
  if (file.type === "image/gif" || file.size <= 400 * 1024) return file;

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", QUALITY)
  );
  // Small flat PNGs can come back larger as JPEG. Keep whichever is smaller.
  if (!blob || blob.size >= file.size) return file;

  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", {
    type: "image/jpeg",
  });
};

interface UploadResponse {
  file_url: string;
}

export class ImageTooLargeError extends Error {}

export const uploadProductImage = async (file: File): Promise<string> => {
  const prepared = await shrink(file);
  if (prepared.size > SERVER_BODY_LIMIT) {
    // Better a clear message than the server's generic 500.
    throw new ImageTooLargeError("image exceeds the server upload limit");
  }

  const body = new FormData();
  // The field name must be exactly "file": the handler reads the first
  // multipart field and requires a filename on it.
  body.append("file", prepared);

  // No Content-Type header — only the browser knows the multipart boundary it
  // generated. baseService leaves it alone when the body is FormData.
  const { file_url } = await request<UploadResponse>("/admin/uploads", {
    method: "POST",
    body,
  });
  return file_url;
};
