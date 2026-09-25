import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { LucideIcon, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/button';

interface ModulePlaceholderProps {
  title: string;
  modulePhase: string;
  description: string;
  icon: LucideIcon;
  features: string[];
  isUnderDevelopment?: boolean;
}

export function ModulePlaceholder({
  title,
  modulePhase,
  description,
  icon: Icon,
  features,
  isUnderDevelopment,
}: ModulePlaceholderProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">{title}</h1>
            <Badge variant="info">{modulePhase}</Badge>
            {isUnderDevelopment && (
              <Badge variant="warning" className="uppercase font-bold tracking-wide">
                Under Development
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        </div>
      </div>

      {isUnderDevelopment && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 flex items-start gap-3 shadow-xs">
          <div className="p-2 rounded-lg bg-amber-100 text-amber-700 shrink-0 mt-0.5">
            <Icon className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-amber-900">Module Currently Under Development</h3>
            <p className="text-xs text-amber-700 leading-relaxed">
              The {title} domain specifications and backend contracts are being structured. Core financial receivables, invoice balances, payment approvals, and customer ledger interactions are actively managed in the Invoices and Payments modules.
            </p>
          </div>
        </div>
      )}

      <Card className="border-slate-200">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-primary-light text-primary">
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-base">Enterprise Module Architectural Contract</CardTitle>
              <p className="text-xs text-slate-500">
                Coupled strictly to canonical Product Master and Customer Master entities.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-slate-50 p-4 border border-slate-200">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              Integrated Capabilities in this Domain:
            </h4>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
              {features.map((f, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary-light" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center justify-between pt-2 text-xs">
            <span className="text-slate-500">Master Data Integration: Product Master & Customer Master linked</span>
            <div className="flex gap-2">
              <Link to="/products">
                <Button variant="outline" size="sm" className="text-xs">
                  Inspect Products
                </Button>
              </Link>
              <Link to="/customers">
                <Button variant="outline" size="sm" className="text-xs">
                  Inspect Customers
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
