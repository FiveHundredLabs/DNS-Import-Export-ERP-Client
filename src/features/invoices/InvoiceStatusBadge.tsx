import { InvoiceStatus } from '../../types/invoice';
import { Badge } from '../../components/ui/badge';
import { CheckCircle2, Clock, AlertTriangle, XCircle, FileEdit, FileText } from 'lucide-react';

interface InvoiceStatusBadgeProps {
  status: InvoiceStatus;
  className?: string;
}

export function InvoiceStatusBadge({ status, className }: InvoiceStatusBadgeProps) {
  switch (status) {
    case 'PAID':
      return (
        <Badge variant="success" className={`gap-1 font-semibold ${className || ''}`}>
          <CheckCircle2 className="h-3 w-3" /> Paid
        </Badge>
      );
    case 'PARTIALLY_PAID':
      return (
        <Badge variant="warning" className={`gap-1 font-semibold ${className || ''}`}>
          <Clock className="h-3 w-3" /> Partially Paid
        </Badge>
      );
    case 'OVERDUE':
      return (
        <Badge variant="destructive" className={`gap-1 font-semibold ${className || ''}`}>
          <AlertTriangle className="h-3 w-3" /> Overdue
        </Badge>
      );
    case 'ISSUED':
      return (
        <Badge variant="default" className={`gap-1 font-semibold bg-primary hover:bg-primary-hover text-primary-foreground ${className || ''}`}>
          <FileText className="h-3 w-3" /> Issued
        </Badge>
      );
    case 'DRAFT':
      return (
        <Badge variant="secondary" className={`gap-1 font-semibold ${className || ''}`}>
          <FileEdit className="h-3 w-3" /> Draft
        </Badge>
      );
    case 'CANCELLED':
      return (
        <Badge variant="outline" className={`gap-1 text-slate-500 line-through ${className || ''}`}>
          <XCircle className="h-3 w-3" /> Cancelled
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}
