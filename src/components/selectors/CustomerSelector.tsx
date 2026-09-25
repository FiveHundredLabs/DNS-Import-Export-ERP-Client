import { useState } from 'react';
import { Customer } from '../../types/customer';
import { useCustomers } from '../../hooks/useCustomers';
import { formatCurrency } from '../../utils/formatters';
import { Search, Building2 } from 'lucide-react';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';

interface CustomerSelectorProps {
  onSelect: (customer: Customer) => void;
  selectedCustomerId?: string;
  assignedRepId?: string;
}

export function CustomerSelector({ onSelect, selectedCustomerId, assignedRepId }: CustomerSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const { customers, loading } = useCustomers({
    search: searchTerm,
    assignedRepId,
    page: 1,
    pageSize: 20,
  });

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-3 shadow-xs">
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search Customer Master by Code, Name, Phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-8 text-xs"
        />
      </div>

      <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 rounded-md border border-slate-100">
        {loading ? (
          <div className="p-3 text-center text-xs text-slate-400">Loading Customer Master...</div>
        ) : customers.length === 0 ? (
          <div className="p-3 text-center text-xs text-slate-400">No customers match your search.</div>
        ) : (
          customers.map((c) => {
            const isSelected = c.id === selectedCustomerId;
            return (
              <div
                key={c.id}
                onClick={() => onSelect(c)}
                className={`flex items-center justify-between p-2.5 text-xs cursor-pointer transition-colors ${
                  isSelected ? 'bg-primary-light/80 border-l-2 border-primary' : 'hover:bg-slate-50'
                }`}
              >
                <div>
                  <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                    {c.name}
                    <Badge variant="outline">{c.type}</Badge>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Code: {c.code} | {c.contactPerson} ({c.phone})
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-slate-700">
                    Limit: {formatCurrency(c.commercialTerms.creditLimit)}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Credit: {c.commercialTerms.creditDays} Days | Outst: {formatCurrency(c.financials.totalOutstanding)}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
