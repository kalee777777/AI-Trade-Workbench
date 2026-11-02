/** 前端工具：日期/CSV。 */

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function fmtDate(s?: string | null): string {
  if (!s) return '—';
  return s.slice(0, 10);
}

export function fmtDateTime(s?: string | null): string {
  if (!s) return '—';
  return s.slice(0, 16).replace('T', ' ');
}

export function csvEscape(v: unknown): string {
  const s = String(v ?? '');
  return `"${s.replace(/"/g, '""')}"`;
}

export function downloadCsv(filename: string, header: string[], rows: unknown[][]): void {
  const csv = '\ufeff' + [header.join(','), ...rows.map((r) => r.map(csvEscape).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** 从文本域粘贴的 CSV（首行表头含 name,email,company,country 可选列）解析为客户行。 */
export function parseClientsCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const cols = splitCsvLine(lines[0]).map((c) => c.toLowerCase().trim());
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    const row: Record<string, string> = {};
    cols.forEach((c, i) => {
      if (['name', 'email', 'company', 'country', 'phone', 'product'].includes(c)) {
        row[c] = (values[i] || '').replace(/^"|"$/g, '');
      }
    });
    return row;
  });
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') inQuotes = !inQuotes;
    else if (ch === ',' && !inQuotes) { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}
