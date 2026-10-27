import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RotateCcw,
  Construction,
  Clock,
  ShieldCheck,
  CheckCircle2,
  ArrowLeft,
  Boxes,
  Truck,
  FileText,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent } from '../../components/ui/card';

export function PurchaseReturnsPlaceholderPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-2 border-b border-slate-200">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/purchasing')}
          className="text-slate-600 hover:text-slate-900 -ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          <span>Dashboard</span>
        </Button>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Purchase Returns & Vendor RMA
          </h1>
          <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 text-xs font-mono">
            UNDER DEVELOPMENT
          </Badge>
        </div>
      </div>

      {/* Main Notice Card */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-amber-500/10 border-b border-amber-200 p-6 flex items-start gap-4">
          <div className="h-12 w-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Construction className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">
                Module Scheduled for Phase 2 Deployment
              </h2>
              <Badge className="bg-amber-600 text-white text-[10px]">IN PROGRESS</Badge>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              The automated Purchase Returns and Supplier Return Merchandise Authorization (RMA) workflow is currently under architectural review and development.
            </p>
          </div>
        </div>

        <CardContent className="p-6 space-y-6">
          {/* Business & Integrity Constraints */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Strict Financial & Inventory Integrity Safeguards</span>
            </h3>
            <p className="text-slate-600 leading-relaxed">
              To guarantee enterprise data safety, no transactional side-effects are active in this section:
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700 pt-1">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>Zero inventory balance write-offs</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>Zero supplier credit note generation</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>Zero Accounts Payable ledger deductions</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>Preserved audit trail and stock records</span>
              </li>
            </ul>
          </div>

          {/* Planned Features Blueprint */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-400">
              Planned Scope & Functional Architecture
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
                <Truck className="h-4 w-4 text-blue-600" />
                <h4 className="font-semibold text-slate-900">Defective Stock Returns</h4>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Link directly with damaged quantities flagged during Goods Received Notes inspection.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
                <FileText className="h-4 w-4 text-indigo-600" />
                <h4 className="font-semibold text-slate-900">Supplier Debit Notes</h4>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Seamless reconciliation with Finance team for contractual AP debit adjustments.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
                <Boxes className="h-4 w-4 text-teal-600" />
                <h4 className="font-semibold text-slate-900">Exchange Replacement</h4>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Track vendor warranty replacements and substitute deliveries without duplicate costs.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-between items-center border-t border-slate-100">
            <span className="text-xs text-slate-400">
              Expected Release: Phase 2 Procurement Release Cycle
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/purchasing/orders')}
              className="text-xs"
            >
              Return to Purchase Orders
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
