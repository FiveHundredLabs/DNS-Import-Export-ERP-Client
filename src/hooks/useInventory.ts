import { useState, useEffect } from 'react';
import { inventoryService } from '../services/InventoryService';

export function useInventory(filters?: any) {
  const [stockBalances, setStockBalances] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      inventoryService.getAllStockBalances(filters),
      inventoryService.getStockMovements(filters),
    ]).then(([balances, movs]) => {
      setStockBalances(balances);
      setMovements(movs);
      setLoading(false);
    }).catch(err => {
      setError(err.message);
      setLoading(false);
    });
  }, []);

  return { stockBalances, movements, loading, error, inventoryService };
}
