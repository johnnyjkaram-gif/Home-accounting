import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { buildReportTable, type ReportType } from '@/lib/server/report-export';

export async function GET(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const type = (sp.get('type') ?? 'monthly') as ReportType;
  const format = sp.get('format') ?? 'csv';
  const year = Number(sp.get('year') ?? new Date().getFullYear());
  const month = Number(sp.get('month') ?? new Date().getMonth() + 1);
  const date = parseDateParam(sp.get('date'));
  const from = sp.get('from') ? new Date(sp.get('from')!) : undefined;
  const to = sp.get('to') ? new Date(sp.get('to') + 'T23:59:59') : undefined;

  const table = await buildReportTable(session.user.householdId, type, { year, month, date, from, to });
  if (!table) return NextResponse.json({ error: 'Unknown report type' }, { status: 400 });

  const filename = type === 'daily' || type === 'weekly'
    ? `${type}-report-${sp.get('date') ?? new Date().toISOString().slice(0, 10)}`
    : `${type}-report-${year}${type === 'monthly' ? '-' + month : ''}`;

  if (format === 'csv') {
    const csv = toCsv(table);
    return new NextResponse(csv, {
      headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${filename}.csv"` },
    });
  }

  if (format === 'xlsx') {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    const aoa: any[][] = [];
    if (table.summary.length) {
      table.summary.forEach(([k, v]) => aoa.push([k, v]));
      aoa.push([]);
    }
    aoa.push(table.columns);
    table.rows.forEach((r) => aoa.push(r));
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return new NextResponse(buffer, {
      headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename="${filename}.xlsx"` },
    });
  }

  if (format === 'pdf') {
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(table.title, 14, 16);
    let startY = 24;
    if (table.summary.length) {
      autoTable(doc, { startY, head: [['Metric', 'Value']], body: table.summary.map(([k, v]) => [String(k), String(v)]), theme: 'plain', margin: { left: 14 } });
      startY = (doc as any).lastAutoTable.finalY + 8;
    }
    autoTable(doc, { startY, head: [table.columns], body: table.rows.map((r) => r.map(String)), margin: { left: 14 } });
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    return new NextResponse(pdfBuffer, {
      headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${filename}.pdf"` },
    });
  }

  return NextResponse.json({ error: 'Unsupported format' }, { status: 400 });
}

function toCsv(table: { title: string; summary: [string, any][]; columns: string[]; rows: any[][] }): string {
  const lines: string[] = [`"${table.title.replace(/"/g, '""')}"`];
  if (table.summary.length) {
    table.summary.forEach(([k, v]) => lines.push(`${csvCell(k)},${csvCell(v)}`));
    lines.push('');
  }
  lines.push(table.columns.map(csvCell).join(','));
  table.rows.forEach((r) => lines.push(r.map(csvCell).join(',')));
  return lines.join('\n');
}

function csvCell(v: any): string {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Parses a plain "YYYY-MM-DD" param into a local-midnight Date, avoiding the UTC-shift
 * that new Date("YYYY-MM-DD") can introduce in negative-offset time zones. */
function parseDateParam(s: string | null): Date | undefined {
  const m = s ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(s) : null;
  if (!m) return undefined;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}
