import { request } from "./baseService";

const ACCEPTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

// The current backend signs every upload with a 1 MiB size. Keep the client
// limit aligned with that contract until the presign request accepts file_size.
export const MAX_IMAGE_BYTES = 1024 * 1024;

interface PresignResponse {
  upload_url: string;
  file_url: string;
}

export const validateProductImage = (file: File): "type" | "size" | null => {
  if (!ACCEPTED_IMAGE_TYPES.has(file.type)) return "type";
  if (file.size > MAX_IMAGE_BYTES) return "size";
  return null;
};

export const uploadProductImage = async (file: File): Promise<string> => {
  const presigned = await request<PresignResponse>("/admin/uploads/presign", {
    method: "POST",
    body: JSON.stringify({
      filename: file.name,
      content_type: file.type,
    }),
  });

  const formData = new FormData();
  formData.append("file", file);

  // This request goes directly to UploadThing. Do not set Content-Type: the
  // browser must supply the multipart boundary.
  const response = await fetch(presigned.upload_url, {
    method: "PUT",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Upload failed (${response.status})`);
  }

  return presigned.file_url;
};
