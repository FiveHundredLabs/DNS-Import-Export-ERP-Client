import { Badge } from '../../components/ui/badge';
import { QuotationStatus } from '../../types/quotation';

interface QuotationStatusBadgeProps {
  status: QuotationStatus;
  className?: string;
}

export function QuotationStatusBadge({ status, className }: QuotationStatusBadgeProps) {
  switch (status) {
    case 'APPROVED':
      return <Badge variant="success" className={className}>Approved</Badge>;
    case 'PENDING_APPROVAL':
      return <Badge variant="warning" className={className}>Pending Approval</Badge>;
    case 'CONVERTED':
      return <Badge variant="default" className={`bg-primary hover:bg-primary-hover text-primary-foreground ${className || ''}`}>Converted</Badge>;
    case 'DRAFT':
      return <Badge variant="secondary" className={className}>Draft</Badge>;
    case 'REJECTED':
      return <Badge variant="destructive" className={className}>Rejected</Badge>;
    case 'EXPIRED':
      return <Badge variant="outline" className={`text-slate-500 border-slate-300 ${className || ''}`}>Expired</Badge>;
    default:
      return <Badge variant="outline" className={className}>{status}</Badge>;
  }
}
