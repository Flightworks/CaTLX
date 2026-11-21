export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows.map(row => row.map(value => {
    const text = typeof value === 'string' && /^[\s\uFEFF]*[=+@-]/.test(value) ? "'" + value : String(value);
    return '"' + text.replace(/"/g, '""') + '"';
  }).join(',')).join('\r\n');

  const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
  const link = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
