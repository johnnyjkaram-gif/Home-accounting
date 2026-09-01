import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import path from 'path';
import { mkdir, writeFile, unlink } from 'fs/promises';
import { prisma } from '@/lib/prisma';
import { getCurrentSession } from '@/lib/auth';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']);
const PARENT_FIELDS: Record<string, 'transactionId' | 'billId' | 'debtId' | 'receivableId'> = {
  transaction: 'transactionId',
  bill: 'billId',
  debt: 'debtId',
  receivable: 'receivableId',
};

export async function POST(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const parent = String(formData.get('parent') ?? '');
  const parentId = String(formData.get('parentId') ?? '');

  if (!file || !PARENT_FIELDS[parent] || !parentId) {
    return NextResponse.json({ error: 'Missing file or parent reference' }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File is too large (10MB max)' }, { status: 413 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'Unsupported file type. Use JPG, PNG, WEBP, GIF or PDF.' }, { status: 415 });
  }

  // Verify the parent row belongs to this household before attaching anything.
  const householdId = session.user.householdId;
  const ownershipOk = await verifyOwnership(parent, parentId, householdId);
  if (!ownershipOk) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await mkdir(UPLOAD_DIR, { recursive: true });
  const ext = safeExt(file.name);
  const storedName = `${randomUUID()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_DIR, storedName), buffer);

  const attachment = await prisma.attachment.create({
    data: {
      filename: file.name.slice(0, 200),
      storedName,
      mimeType: file.type,
      size: file.size,
      [PARENT_FIELDS[parent]]: parentId,
    } as any,
  });

  return NextResponse.json({ id: attachment.id, filename: attachment.filename }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await req.json();
  const attachment = await prisma.attachment.findUnique({
    where: { id },
    include: { transaction: true, bill: true, debt: true, receivable: true },
  });
  if (!attachment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const householdId =
    attachment.transaction?.householdId ?? attachment.bill?.householdId ?? attachment.debt?.householdId ?? attachment.receivable?.householdId;
  if (householdId !== session.user.householdId) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.attachment.delete({ where: { id } });
  await unlink(path.join(UPLOAD_DIR, attachment.storedName)).catch(() => {});

  return NextResponse.json({ ok: true });
}

async function verifyOwnership(parent: string, parentId: string, householdId: string): Promise<boolean> {
  switch (parent) {
    case 'transaction':
      return !!(await prisma.transaction.findFirst({ where: { id: parentId, householdId } }));
    case 'bill':
      return !!(await prisma.bill.findFirst({ where: { id: parentId, householdId } }));
    case 'debt':
      return !!(await prisma.debt.findFirst({ where: { id: parentId, householdId } }));
    case 'receivable':
      return !!(await prisma.receivable.findFirst({ where: { id: parentId, householdId } }));
    default:
      return false;
  }
}

function safeExt(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  return /^\.[a-z0-9]{1,5}$/.test(ext) ? ext : '';
}
