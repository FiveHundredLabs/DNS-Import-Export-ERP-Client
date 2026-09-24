import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-rose-200 bg-rose-50/50 p-8 text-center my-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h3 className="mt-3 text-base font-semibold text-rose-900">{title}</h3>
      <p className="mt-1 text-sm text-rose-700 max-w-md">{message}</p>
      {onRetry && (
        <div className="mt-4">
          <Button variant="outline" size="sm" onClick={onRetry} className="gap-2 border-rose-300 text-rose-700 hover:bg-rose-100">
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </Button>
        </div>
      )}
    </div>
  );
}
