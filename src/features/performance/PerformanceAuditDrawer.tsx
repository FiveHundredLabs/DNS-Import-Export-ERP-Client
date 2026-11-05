import React from 'react';
import {
  Drawer,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerContent,
  DrawerFooter,
} from '../../components/ui/drawer';
import { Button } from '../../components/ui/button';
import { RepPersonalPerformanceView } from './RepPersonalPerformanceView';
import { UserCheck } from 'lucide-react';

interface PerformanceAuditDrawerProps {
  open: boolean;
  onClose: () => void;
  repId: string | null;
  repName?: string;
  month: string;
}

export function PerformanceAuditDrawer({
  open,
  onClose,
  repId,
  repName,
  month,
}: PerformanceAuditDrawerProps) {
  if (!repId) return null;

  return (
    <Drawer open={open} onOpenChange={onClose} width="3xl">
      <DrawerHeader>
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
            <UserCheck className="h-5 w-5" />
          </span>
          <div>
            <DrawerTitle className="text-base font-semibold text-slate-900">
              {repName ? `Representative Ledger: ${repName}` : 'Representative Performance Ledger'}
            </DrawerTitle>
            <DrawerDescription className="text-xs text-slate-500">
              Invoice sales breakdown, cash collections, and earned cash incentives for {month}.
            </DrawerDescription>
          </div>
        </div>
      </DrawerHeader>

      <DrawerContent>
        <RepPersonalPerformanceView repId={repId} month={month} isDrawer={true} />
      </DrawerContent>

      <DrawerFooter>
        <Button variant="outline" onClick={onClose} className="h-9 text-xs">
          Close Audit Drawer
        </Button>
      </DrawerFooter>
    </Drawer>
  );
}
