import { useMemo } from 'react';
import { useStockBalances, useStockMovements } from '../api/inventory/inventory.hooks';
import { inventoryService } from '../services/InventoryService';
import type { ListStockBalancesParams } from '../api/inventory/inventory.types';

export function useInventory(filters?: ListStockBalancesParams) {
  const balancesQuery = useStockBalances(
    { page: filters?.page ?? 1, pageSize: filters?.pageSize ?? 100, ...filters },
  );
  const movementsQuery = useStockMovements({ page: 1, pageSize: 50 });

  const stockBalances = useMemo(() => {
    const rows = balancesQuery.data?.data ?? [];
    return rows.map((b) => ({
      id: b.id || b.productId,
      productId: b.productId,
      locationId: 'WH-MAIN',
      locationType: 'WAREHOUSE',
      productName: b.name,
      sku: b.sku,
      category: b.category || 'General',
      brand: b.brand || null,
      uom: b.uom || 'PCS',
      reorderLevel: b.reorderLevel ?? 0,
      costPrice: b.costPrice ?? 0,
      sellingPrice: b.sellingPrice ?? 0,
      availableQuantity: b.stages?.available ?? 0,
      reservedQuantity: b.stages?.reserved ?? 0,
      dispatchQuantity: b.stages?.dispatch ?? 0,
      deliveredQuantity: b.stages?.delivered ?? 0,
      soldQuantity: b.stages?.sold ?? 0,
      damagedQuantity: b.stages?.damaged ?? 0,
      scrapOffQuantity: b.stages?.scrapOff ?? 0,
      totalActiveStock: b.totalActiveStock ?? 0,
      updatedAt: b.updatedAt,
    }));
  }, [balancesQuery.data]);

  const movements = useMemo(() => movementsQuery.data?.data ?? [], [movementsQuery.data]);

  return {
    stockBalances,
    movements,
    meta: balancesQuery.data?.meta,
    loading: balancesQuery.isLoading,
    error: balancesQuery.error?.message || movementsQuery.error?.message || null,
    refetch: balancesQuery.refetch,
    inventoryService,
  };
}
