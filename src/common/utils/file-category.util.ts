export type FileCategory = 'image' | 'video' | 'document' | 'other';

const DOCUMENT_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
]);

export function classifyMimeType(mimeType: string | null): FileCategory {
  if (!mimeType) {
    return 'other';
  }
  if (mimeType.startsWith('image/')) {
    return 'image';
  }
  if (mimeType.startsWith('video/')) {
    return 'video';
  }
  if (DOCUMENT_MIME_TYPES.has(mimeType)) {
    return 'document';
  }
  return 'other';
}
