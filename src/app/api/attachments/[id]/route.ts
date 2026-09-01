import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { readFile } from 'fs/promises';
import { prisma } from '@/lib/prisma';
import { getCurrentSession } from '@/lib/auth';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getCurrentSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const attachment = await prisma.attachment.findUnique({
    where: { id: params.id },
    include: { transaction: true, bill: true, debt: true, receivable: true },
  });
  if (!attachment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const householdId =
    attachment.transaction?.householdId ?? attachment.bill?.householdId ?? attachment.debt?.householdId ?? attachment.receivable?.householdId;
  if (householdId !== session.user.householdId) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  try {
    const file = await readFile(path.join(UPLOAD_DIR, attachment.storedName));
    return new NextResponse(file as any, {
      headers: {
        'Content-Type': attachment.mimeType,
        'Content-Disposition': `inline; filename="${encodeURIComponent(attachment.filename)}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch {
    return NextResponse.json({ error: 'File missing on disk' }, { status: 404 });
  }
}
