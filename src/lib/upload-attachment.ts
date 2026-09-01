'use client';

export type AttachmentParent = 'transaction' | 'bill' | 'debt' | 'receivable';

export async function uploadAttachment(parent: AttachmentParent, parentId: string, file: File): Promise<boolean> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('parent', parent);
  formData.append('parentId', parentId);
  const res = await fetch('/api/attachments', { method: 'POST', body: formData });
  return res.ok;
}
