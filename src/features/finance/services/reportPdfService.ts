export class ReportPdfService {
  /**
   * Triggers native print/PDF export dialog with pre-configured document title
   * so the default save filename is clear and formal.
   */
  triggerPrint(documentTitle: string): void {
    if (typeof window === 'undefined') return;
    const originalTitle = document.title;
    document.title = documentTitle;
    window.print();
    // Restore title after print dialog closes
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  }

  /**
   * Generates a downloadable standalone HTML file that can be opened in any browser
   * or converted to PDF natively with clean print styles.
   */
  downloadPrintableHtml(
    reportTitle: string,
    htmlContent: string,
    filename: string
  ): void {
    if (typeof window === 'undefined' || !window.document) return;

    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${reportTitle}</title>
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; margin: 0; padding: 20px; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; }
    th { background: #f1f5f9; font-weight: 600; font-size: 11px; text-transform: uppercase; }
    .text-right { text-align: right; }
    .font-mono { font-family: ui-monospace, monospace; }
    .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; }
    .signature-grid { display: flex; justify-content: space-between; margin-top: 40px; padding-top: 20px; border-top: 2px solid #cbd5e1; gap: 20px; }
    .sig-box { flex: 1; border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px; }
    .sig-line { height: 40px; border-bottom: 1px dashed #94a3b8; margin-bottom: 8px; }
  </style>
</head>
<body>
  ${htmlContent}
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.endsWith('.html') ? filename : `${filename}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export const reportPdfService = new ReportPdfService();
