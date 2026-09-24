import { BaseEntity } from './common';

export type WarehouseType = 'MAIN_WAREHOUSE' | 'SHOWROOM' | 'IN_TRANSIT';

export interface Warehouse extends BaseEntity {
  code: string;
  name: string;
  type: WarehouseType;
  address: string;
  contactPerson: string;
  phone: string;
}

export interface StockBalance extends BaseEntity {
  productId: string;
  productSku: string;
  productName: string;
  warehouseId: string;
  warehouseName: string;
  availableQuantity: number;
  damagedQuantity: number;
  reservedQuantity: number;
}

export type MovementType =
  | 'GRN_RECEIPT'
  | 'ORDER_PICKING'
  | 'ORDER_ISSUE'
  | 'TRANSFER_OUT'
  | 'TRANSFER_IN'
  | 'DAMAGE_WRITE_OFF'
  | 'RETURN_RESTOCK';

export interface StockMovement extends BaseEntity {
  productId: string;
  warehouseId: string;
  movementType: MovementType;
  quantity: number;
  previousBalance: number;
  newBalance: number;
  referenceType: 'GRN' | 'SALES_ORDER' | 'TRANSFER' | 'RETURN' | 'POS';
  referenceId: string;
  notes?: string;
  actorId: string;
  actorName: string;
}
