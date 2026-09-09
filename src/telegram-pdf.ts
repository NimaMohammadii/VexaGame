export function makeSimplePdf(lines: string[], maxLines = 1_200): Uint8Array {
  const safe = lines.flatMap((line) => ascii(line).match(/.{1,92}/g) || ['']).slice(0, Math.max(1, Math.floor(maxLines) || 1_200));
  const pages: string[][] = [];
  for (let index = 0; index < safe.length; index += 68) pages.push(safe.slice(index, index + 68));
  if (!pages.length) pages.push(['No data']);

  const objects: string[] = ['<< /Type /Catalog /Pages 2 0 R >>', ''];
  const pageObjectIds: number[] = [];
  for (const pageLines of pages) {
    const content = ['BT', '/F1 9 Tf', '36 806 Td', '11 TL', ...pageLines.map((line, index) => `${index ? 'T* ' : ''}(${pdfEscape(line)}) Tj`), 'ET'].join('\n');
    const pageId = objects.length + 1;
    const contentId = pageId + 1;
    pageObjectIds.push(pageId);
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`);
    objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  }
  objects[1] = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageObjectIds.length} >>`;
  objects.splice(2, 0, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const fixedPageIds = pageObjectIds.map((id) => id + 1);
  objects[1] = `<< /Type /Pages /Kids [${fixedPageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${fixedPageIds.length} >>`;
  for (let index = 3; index < objects.length; index += 2) {
    objects[index] = objects[index].replace(/Contents (\d+) 0 R/, (_match, id) => `Contents ${Number(id) + 1} 0 R`);
  }
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n `).join('\n')}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

function ascii(value: unknown): string {
  return String(value ?? '—').replace(/[^\x20-\x7E]/g, '?').slice(0, 500);
}

function pdfEscape(value: string): string {
  return value.replace(/[\\()]/g, '\\$&');
}
