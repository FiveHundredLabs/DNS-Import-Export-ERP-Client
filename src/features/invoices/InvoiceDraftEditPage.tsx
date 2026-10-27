import { InvoiceDetailPage } from './InvoiceDetailPage';

/**
 * InvoiceDraftEditPage
 * 
 * Unified into InvoiceDetailPage: draft invoices are directly and properly editable in-place 
 * at /invoices/:id without needing a separate UI screen.
 * This component acts as a backward-compatible wrapper for /invoices/:id/edit routes and legacy links.
 */
export function InvoiceDraftEditPage() {
  return <InvoiceDetailPage />;
}

export default InvoiceDraftEditPage;
