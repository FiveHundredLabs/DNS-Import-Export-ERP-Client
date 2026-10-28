import { SerialNumberRecord, SerialNumberStatus } from '../types/inventory';
import { MOCK_GRNS } from '../mock/mockInventory';
import { MOCK_PRODUCTS } from '../mock/mockProducts';

const INITIAL_SERIALS: SerialNumberRecord[] = [
  // Schneider Acti9 32A MCB (from GRN-2025-001)
  {
    id: 'sn-001',
    serialNumber: 'SN-RHD-2025-001',
    productId: 'prod-001',
    productName: 'Schneider Acti9 32A Double Pole MCB',
    sku: 'DNS-MCB-32A-2P',
    barcode: '8901020304011',
    locationId: 'WH-MAIN',
    locationName: 'Main Warehouse',
    binLocation: 'Bay A-01 / Shelf 2',
    status: 'IN_STOCK',
    grnId: 'GRN-2025-001',
    grnNumber: 'GRN-2025-001',
    receivedDate: '2025-06-10T10:00:00Z',
    receivedBy: 'Amal Perera (Stock Keeper)',
  },
  {
    id: 'sn-002',
    serialNumber: 'SN-RHD-2025-002',
    productId: 'prod-001',
    productName: 'Schneider Acti9 32A Double Pole MCB',
    sku: 'DNS-MCB-32A-2P',
    barcode: '8901020304011',
    locationId: 'WH-MAIN',
    locationName: 'Main Warehouse',
    binLocation: 'Bay A-01 / Shelf 2',
    status: 'IN_STOCK',
    grnId: 'GRN-2025-001',
    grnNumber: 'GRN-2025-001',
    receivedDate: '2025-06-10T10:00:00Z',
    receivedBy: 'Amal Perera (Stock Keeper)',
  },
  {
    id: 'sn-003',
    serialNumber: 'SN-RHD-2025-003',
    productId: 'prod-001',
    productName: 'Schneider Acti9 32A Double Pole MCB',
    sku: 'DNS-MCB-32A-2P',
    barcode: '8901020304011',
    locationId: 'WH-MAIN',
    locationName: 'Main Warehouse',
    binLocation: 'Bay A-01 / Shelf 2',
    status: 'ALLOCATED',
    grnId: 'GRN-2025-001',
    grnNumber: 'GRN-2025-001',
    orderId: 'ord-001',
    orderNumber: 'SO-DLR-COL-001-1001',
    customerId: 'cust-001',
    customerName: 'Electro City (Pvt) Ltd',
    receivedDate: '2025-06-10T10:00:00Z',
    receivedBy: 'Amal Perera (Stock Keeper)',
  },
  {
    id: 'sn-004',
    serialNumber: 'SN-RHD-2025-004',
    productId: 'prod-001',
    productName: 'Schneider Acti9 32A Double Pole MCB',
    sku: 'DNS-MCB-32A-2P',
    barcode: '8901020304011',
    locationId: 'SR-MAIN',
    locationName: 'Colombo Showroom',
    binLocation: 'Display Shelf 3',
    status: 'IN_STOCK',
    grnId: 'GRN-2025-001',
    grnNumber: 'GRN-2025-001',
    receivedDate: '2025-06-10T10:00:00Z',
    receivedBy: 'Amal Perera (Stock Keeper)',
  },
  {
    id: 'sn-005',
    serialNumber: 'SN-RHD-2025-005',
    productId: 'prod-001',
    productName: 'Schneider Acti9 32A Double Pole MCB',
    sku: 'DNS-MCB-32A-2P',
    barcode: '8901020304011',
    locationId: 'WH-MAIN',
    locationName: 'Main Warehouse',
    binLocation: 'Quarantine Bay Q-01',
    status: 'DAMAGED',
    grnId: 'GRN-2025-001',
    grnNumber: 'GRN-2025-001',
    receivedDate: '2025-06-10T10:00:00Z',
    receivedBy: 'Amal Perera (Stock Keeper)',
    notes: 'Damaged switch toggle latch during transit unloading. Quarantined.',
  },
  {
    id: 'sn-006',
    serialNumber: 'SN-RHD-2025-006',
    productId: 'prod-001',
    productName: 'Schneider Acti9 32A Double Pole MCB',
    sku: 'DNS-MCB-32A-2P',
    barcode: '8901020304011',
    locationId: 'WH-MAIN',
    locationName: 'Main Warehouse',
    binLocation: 'Bay A-01 / Shelf 3',
    status: 'DISPATCHED',
    grnId: 'GRN-2025-001',
    grnNumber: 'GRN-2025-001',
    orderId: 'ord-002',
    orderNumber: 'SO-DLR-GAM-002-1002',
    customerId: 'cust-002',
    customerName: 'Lanka Light & Switchgear',
    receivedDate: '2025-06-10T10:00:00Z',
    receivedBy: 'Amal Perera (Stock Keeper)',
    dispatchedDate: '2025-07-02T14:30:00Z',
  },
  {
    id: 'sn-007',
    serialNumber: 'SN-RHD-2025-007',
    productId: 'prod-001',
    productName: 'Schneider Acti9 32A Double Pole MCB',
    sku: 'DNS-MCB-32A-2P',
    barcode: '8901020304011',
    locationId: 'WH-MAIN',
    locationName: 'Main Warehouse',
    binLocation: 'Bay A-01 / Shelf 3',
    status: 'IN_STOCK',
    grnId: 'GRN-2025-001',
    grnNumber: 'GRN-2025-001',
    receivedDate: '2025-06-10T10:00:00Z',
    receivedBy: 'Amal Perera (Stock Keeper)',
  },
  {
    id: 'sn-008',
    serialNumber: 'SN-RHD-2025-008',
    productId: 'prod-001',
    productName: 'Schneider Acti9 32A Double Pole MCB',
    sku: 'DNS-MCB-32A-2P',
    barcode: '8901020304011',
    locationId: 'WH-MAIN',
    locationName: 'Main Warehouse',
    binLocation: 'Bay A-01 / Shelf 3',
    status: 'IN_STOCK',
    grnId: 'GRN-2025-001',
    grnNumber: 'GRN-2025-001',
    receivedDate: '2025-06-10T10:00:00Z',
    receivedBy: 'Amal Perera (Stock Keeper)',
  },
  {
    id: 'sn-009',
    serialNumber: 'SN-RHD-2025-009',
    productId: 'prod-001',
    productName: 'Schneider Acti9 32A Double Pole MCB',
    sku: 'DNS-MCB-32A-2P',
    barcode: '8901020304011',
    locationId: 'WH-MAIN',
    locationName: 'Main Warehouse',
    binLocation: 'Bay A-01 / Shelf 3',
    status: 'IN_STOCK',
    grnId: 'GRN-2025-001',
    grnNumber: 'GRN-2025-001',
    receivedDate: '2025-06-10T10:00:00Z',
    receivedBy: 'Amal Perera (Stock Keeper)',
  },
  {
    id: 'sn-010',
    serialNumber: 'SN-RHD-2025-010',
    productId: 'prod-001',
    productName: 'Schneider Acti9 32A Double Pole MCB',
    sku: 'DNS-MCB-32A-2P',
    barcode: '8901020304011',
    locationId: 'WH-MAIN',
    locationName: 'Main Warehouse',
    binLocation: 'Bay A-01 / Shelf 3',
    status: 'IN_STOCK',
    grnId: 'GRN-2025-001',
    grnNumber: 'GRN-2025-001',
    receivedDate: '2025-06-10T10:00:00Z',
    receivedBy: 'Amal Perera (Stock Keeper)',
  },

  // Growatt 5000ES Inverters (from GRN-2025-004)
  {
    id: 'sn-011',
    serialNumber: 'SN-GW-5K-0881',
    productId: 'prod-005',
    productName: 'Growatt 5000ES 5kW Off-Grid Solar Inverter',
    sku: 'DNS-SOL-INV-5KW',
    barcode: '8901020304059',
    locationId: 'WH-MAIN',
    locationName: 'Main Warehouse',
    binLocation: 'Bay S-04 / Pallet 1',
    status: 'IN_STOCK',
    grnId: 'GRN-2025-004',
    grnNumber: 'GRN-2025-004',
    receivedDate: '2025-07-15T08:00:00Z',
    receivedBy: 'Amal Perera (Stock Keeper)',
  },
  {
    id: 'sn-012',
    serialNumber: 'SN-GW-5K-0882',
    productId: 'prod-005',
    productName: 'Growatt 5000ES 5kW Off-Grid Solar Inverter',
    sku: 'DNS-SOL-INV-5KW',
    barcode: '8901020304059',
    locationId: 'WH-MAIN',
    locationName: 'Main Warehouse',
    binLocation: 'Bay S-04 / Pallet 1',
    status: 'ALLOCATED',
    grnId: 'GRN-2025-004',
    grnNumber: 'GRN-2025-004',
    orderId: 'ord-003',
    orderNumber: 'SO-DLR-KUR-003-1003',
    customerId: 'cust-003',
    customerName: 'Wayamba Solar Energy Ltd',
    receivedDate: '2025-07-15T08:00:00Z',
    receivedBy: 'Amal Perera (Stock Keeper)',
  },
  {
    id: 'sn-013',
    serialNumber: 'SN-GW-5K-0883',
    productId: 'prod-005',
    productName: 'Growatt 5000ES 5kW Off-Grid Solar Inverter',
    sku: 'DNS-SOL-INV-5KW',
    barcode: '8901020304059',
    locationId: 'SR-MAIN',
    locationName: 'Colombo Showroom',
    binLocation: 'Demo Bay D-01',
    status: 'IN_STOCK',
    grnId: 'GRN-2025-004',
    grnNumber: 'GRN-2025-004',
    receivedDate: '2025-07-15T08:00:00Z',
    receivedBy: 'Amal Perera (Stock Keeper)',
  },

  // Philips LED Panel (from GRN-2025-003)
  {
    id: 'sn-014',
    serialNumber: 'SN-PHI-LED-1001',
    productId: 'prod-004',
    productName: 'Philips SmartBright 600x600 48W Recessed Panel',
    sku: 'DNS-LED-PNL-48W',
    barcode: '8901020304042',
    locationId: 'WH-MAIN',
    locationName: 'Main Warehouse',
    binLocation: 'Bay L-02 / Shelf 1',
    status: 'IN_STOCK',
    grnId: 'GRN-2025-003',
    grnNumber: 'GRN-2025-003',
    receivedDate: '2025-07-01T08:00:00Z',
    receivedBy: 'Amal Perera (Stock Keeper)',
  },
  {
    id: 'sn-015',
    serialNumber: 'SN-PHI-LED-1002',
    productId: 'prod-004',
    productName: 'Philips SmartBright 600x600 48W Recessed Panel',
    sku: 'DNS-LED-PNL-48W',
    barcode: '8901020304042',
    locationId: 'WH-MAIN',
    locationName: 'Main Warehouse',
    binLocation: 'Quarantine Bay Q-01',
    status: 'DAMAGED',
    grnId: 'GRN-2025-003',
    grnNumber: 'GRN-2025-003',
    receivedDate: '2025-07-01T08:00:00Z',
    receivedBy: 'Amal Perera (Stock Keeper)',
    notes: 'Diffuser cracked during pallet unstrapping.',
  },
  // ─── Industrial Power Tools Division (WH-MAIN) ───────────────────────────
  {
    id: 'sn-pt-001',
    serialNumber: 'SN-BSH-GBH-001',
    productId: 'prod-pt-001',
    productName: 'Bosch GBH 2-28 F Professional Rotary Hammer SDS-Plus (880W, 3.2J)',
    sku: 'DNS-PT-GBH228',
    barcode: '8901020305018',
    locationId: 'WH-MAIN',
    locationName: 'Main Warehouse',
    binLocation: 'Power Tools Bay PT-01 / Shelf A',
    status: 'IN_STOCK',
    grnId: 'GRN-2025-PT01',
    grnNumber: 'GRN-2025-PT01',
    receivedDate: '2025-07-20T10:00:00Z',
    receivedBy: 'Amal Perera (Stock Keeper)',
  },
  {
    id: 'sn-pt-002',
    serialNumber: 'SN-BSH-GBH-002',
    productId: 'prod-pt-001',
    productName: 'Bosch GBH 2-28 F Professional Rotary Hammer SDS-Plus (880W, 3.2J)',
    sku: 'DNS-PT-GBH228',
    barcode: '8901020305018',
    locationId: 'WH-MAIN',
    locationName: 'Main Warehouse',
    binLocation: 'Power Tools Bay PT-01 / Shelf A',
    status: 'IN_STOCK',
    grnId: 'GRN-2025-PT01',
    grnNumber: 'GRN-2025-PT01',
    receivedDate: '2025-07-20T10:00:00Z',
    receivedBy: 'Amal Perera (Stock Keeper)',
  },
  {
    id: 'sn-pt-003',
    serialNumber: 'SN-BSH-GBH-003',
    productId: 'prod-pt-001',
    productName: 'Bosch GBH 2-28 F Professional Rotary Hammer SDS-Plus (880W, 3.2J)',
    sku: 'DNS-PT-GBH228',
    barcode: '8901020305018',
    locationId: 'WH-MAIN',
    locationName: 'Main Warehouse',
    binLocation: 'Quarantine Bay Q-01',
    status: 'DAMAGED',
    grnId: 'GRN-2025-PT01',
    grnNumber: 'GRN-2025-PT01',
    receivedDate: '2025-07-20T10:00:00Z',
    receivedBy: 'Amal Perera (Stock Keeper)',
    notes: 'Chucking mechanism jammed during unboxing inspection. Segregated in Quarantine Bay Q-01.',
  },
  {
    id: 'sn-pt-004',
    serialNumber: 'SN-MKT-DGA-401',
    productId: 'prod-pt-002',
    productName: 'Makita DGA404Z 18V LXT Brushless 100mm Cordless Angle Grinder',
    sku: 'DNS-PT-DGA404',
    barcode: '8901020305025',
    locationId: 'WH-MAIN',
    locationName: 'Main Warehouse',
    binLocation: 'Power Tools Bay PT-02 / Shelf B',
    status: 'IN_STOCK',
    grnId: 'GRN-2025-PT02',
    grnNumber: 'GRN-2025-PT02',
    receivedDate: '2025-07-28T11:00:00Z',
    receivedBy: 'Amal Perera (Stock Keeper)',
  },
  {
    id: 'sn-pt-005',
    serialNumber: 'SN-MKT-DGA-402',
    productId: 'prod-pt-002',
    productName: 'Makita DGA404Z 18V LXT Brushless 100mm Cordless Angle Grinder',
    sku: 'DNS-PT-DGA404',
    barcode: '8901020305025',
    locationId: 'WH-MAIN',
    locationName: 'Main Warehouse',
    binLocation: 'Order Staging Area',
    status: 'ALLOCATED',
    grnId: 'GRN-2025-PT02',
    grnNumber: 'GRN-2025-PT02',
    receivedDate: '2025-07-28T11:00:00Z',
    receivedBy: 'Amal Perera (Stock Keeper)',
  },
  {
    id: 'sn-pt-006',
    serialNumber: 'SN-MKT-DGA-403',
    productId: 'prod-pt-002',
    productName: 'Makita DGA404Z 18V LXT Brushless 100mm Cordless Angle Grinder',
    sku: 'DNS-PT-DGA404',
    barcode: '8901020305025',
    locationId: 'WH-MAIN',
    locationName: 'Main Warehouse',
    binLocation: 'Quarantine Bay Q-01',
    status: 'DAMAGED',
    grnId: 'GRN-2025-PT02',
    grnNumber: 'GRN-2025-PT02',
    receivedDate: '2025-07-28T11:00:00Z',
    receivedBy: 'Amal Perera (Stock Keeper)',
    notes: 'Fractured battery terminal casing from transit impact. Quarantined.',
  },
  {
    id: 'sn-pt-007',
    serialNumber: 'SN-DWT-DCD-901',
    productId: 'prod-pt-003',
    productName: 'DeWalt DCD996P2 18V XR Brushless 3-Speed Combi Hammer Drill Kit',
    sku: 'DNS-PT-DCD996',
    barcode: '8901020305032',
    locationId: 'WH-MAIN',
    locationName: 'Main Warehouse',
    binLocation: 'Power Tools Bay PT-03 / Shelf A',
    status: 'IN_STOCK',
    grnId: 'GRN-2025-PT03',
    grnNumber: 'GRN-2025-PT03',
    receivedDate: '2025-08-05T09:30:00Z',
    receivedBy: 'Amal Perera (Stock Keeper)',
  },
  {
    id: 'sn-pt-008',
    serialNumber: 'SN-DWT-DCD-902',
    productId: 'prod-pt-003',
    productName: 'DeWalt DCD996P2 18V XR Brushless 3-Speed Combi Hammer Drill Kit',
    sku: 'DNS-PT-DCD996',
    barcode: '8901020305032',
    locationId: 'WH-MAIN',
    locationName: 'Main Warehouse',
    binLocation: 'Power Tools Bay PT-03 / Shelf A',
    status: 'IN_STOCK',
    grnId: 'GRN-2025-PT03',
    grnNumber: 'GRN-2025-PT03',
    receivedDate: '2025-08-05T09:30:00Z',
    receivedBy: 'Amal Perera (Stock Keeper)',
  },
  {
    id: 'sn-pt-009',
    serialNumber: 'SN-MLW-M18-801',
    productId: 'prod-pt-004',
    productName: 'Milwaukee M18 FUEL 1/2" High Torque Impact Wrench (1898Nm)',
    sku: 'DNS-PT-M18FHIWF',
    barcode: '8901020305049',
    locationId: 'WH-MAIN',
    locationName: 'Main Warehouse',
    binLocation: 'Power Tools Bay PT-04 / Shelf C',
    status: 'IN_STOCK',
    grnId: 'GRN-2025-PT04',
    grnNumber: 'GRN-2025-PT04',
    receivedDate: '2025-08-15T14:20:00Z',
    receivedBy: 'Amal Perera (Stock Keeper)',
  },
  {
    id: 'sn-pt-010',
    serialNumber: 'SN-MLW-M18-802',
    productId: 'prod-pt-004',
    productName: 'Milwaukee M18 FUEL 1/2" High Torque Impact Wrench (1898Nm)',
    sku: 'DNS-PT-M18FHIWF',
    barcode: '8901020305049',
    locationId: 'WH-MAIN',
    locationName: 'Main Warehouse',
    binLocation: 'Quarantine Bay Q-01',
    status: 'DAMAGED',
    grnId: 'GRN-2025-PT04',
    grnNumber: 'GRN-2025-PT04',
    receivedDate: '2025-08-15T14:20:00Z',
    receivedBy: 'Amal Perera (Stock Keeper)',
    notes: 'Anvil friction ring retention pin broken in transit carton drop. Quarantined.',
  },
  {
    id: 'sn-pt-011',
    serialNumber: 'SN-MKT-HM-001',
    productId: 'prod-pt-006',
    productName: 'Makita HM1307CB 19kg 30mm Hex Demolition Breaker (1510W, 25.5J)',
    sku: 'DNS-PT-HM1307',
    barcode: '8901020305063',
    locationId: 'WH-MAIN',
    locationName: 'Main Warehouse',
    binLocation: 'Heavy Tools Bay HT-01',
    status: 'IN_STOCK',
    grnId: 'GRN-2025-PT02',
    grnNumber: 'GRN-2025-PT02',
    receivedDate: '2025-07-28T11:00:00Z',
    receivedBy: 'Amal Perera (Stock Keeper)',
  },
  {
    id: 'sn-pt-012',
    serialNumber: 'SN-MKT-HM-002',
    productId: 'prod-pt-006',
    productName: 'Makita HM1307CB 19kg 30mm Hex Demolition Breaker (1510W, 25.5J)',
    sku: 'DNS-PT-HM1307',
    barcode: '8901020305063',
    locationId: 'WH-MAIN',
    locationName: 'Main Warehouse',
    binLocation: 'Quarantine Bay Q-01',
    status: 'DAMAGED',
    grnId: 'GRN-2025-PT02',
    grnNumber: 'GRN-2025-PT02',
    receivedDate: '2025-07-28T11:00:00Z',
    receivedBy: 'Amal Perera (Stock Keeper)',
    notes: 'Oil leakage observed from gear housing seal during receipt inspection.',
  },
  {
    id: 'sn-pt-013',
    serialNumber: 'SN-BSH-GST-201',
    productId: 'prod-pt-008',
    productName: 'Bosch GST 8000 E Professional 710W Pendulum Jigsaw',
    sku: 'DNS-PT-GST8000',
    barcode: '8901020305087',
    locationId: 'WH-MAIN',
    locationName: 'Main Warehouse',
    binLocation: 'Power Tools Bay PT-01 / Shelf B',
    status: 'IN_STOCK',
    grnId: 'GRN-2025-PT01',
    grnNumber: 'GRN-2025-PT01',
    receivedDate: '2025-07-20T10:00:00Z',
    receivedBy: 'Amal Perera (Stock Keeper)',
  },
  {
    id: 'sn-pt-014',
    serialNumber: 'SN-BSH-GST-202',
    productId: 'prod-pt-008',
    productName: 'Bosch GST 8000 E Professional 710W Pendulum Jigsaw',
    sku: 'DNS-PT-GST8000',
    barcode: '8901020305087',
    locationId: 'WH-MAIN',
    locationName: 'Main Warehouse',
    binLocation: 'Quarantine Bay Q-01',
    status: 'DAMAGED',
    grnId: 'GRN-2025-PT01',
    grnNumber: 'GRN-2025-PT01',
    receivedDate: '2025-07-20T10:00:00Z',
    receivedBy: 'Amal Perera (Stock Keeper)',
    notes: 'Pendulum lever snapped during transit unloading. Quarantined.',
  },
  {
    id: 'sn-pt-015',
    serialNumber: 'SN-SFM-650-101',
    productId: 'prod-pt-011',
    productName: 'Stanley FatMax FME650K 300W Oscillating Multi-Tool',
    sku: 'DNS-PT-FME650',
    barcode: '8901020305117',
    locationId: 'WH-MAIN',
    locationName: 'Main Warehouse',
    binLocation: 'Power Tools Bay PT-05',
    status: 'IN_STOCK',
    grnId: 'GRN-2025-PT04',
    grnNumber: 'GRN-2025-PT04',
    receivedDate: '2025-08-15T14:20:00Z',
    receivedBy: 'Amal Perera (Stock Keeper)',
  },
  {
    id: 'sn-pt-016',
    serialNumber: 'SN-SFM-650-102',
    productId: 'prod-pt-011',
    productName: 'Stanley FatMax FME650K 300W Oscillating Multi-Tool',
    sku: 'DNS-PT-FME650',
    barcode: '8901020305117',
    locationId: 'WH-MAIN',
    locationName: 'Main Warehouse',
    binLocation: 'Quarantine Bay Q-01',
    status: 'DAMAGED',
    grnId: 'GRN-2025-PT04',
    grnNumber: 'GRN-2025-PT04',
    receivedDate: '2025-08-15T14:20:00Z',
    receivedBy: 'Amal Perera (Stock Keeper)',
    notes: 'Accessory clamp lock screw stripped on delivery. Quarantined.',
  },
  {
    id: 'sn-pt-017',
    serialNumber: 'SN-DWT-D25-501',
    productId: 'prod-pt-012',
    productName: 'DeWalt D25614K 45mm SDS-Max Combination Hammer (1350W, 10.5J)',
    sku: 'DNS-PT-D25614',
    barcode: '8901020305124',
    locationId: 'WH-MAIN',
    locationName: 'Main Warehouse',
    binLocation: 'Heavy Tools Bay HT-02',
    status: 'IN_STOCK',
    grnId: 'GRN-2025-PT03',
    grnNumber: 'GRN-2025-PT03',
    receivedDate: '2025-08-05T09:30:00Z',
    receivedBy: 'Amal Perera (Stock Keeper)',
  },
  {
    id: 'sn-pt-018',
    serialNumber: 'SN-MLW-M12-301',
    productId: 'prod-pt-010',
    productName: 'Milwaukee M12 FUEL Sub-Compact 3/8" Cordless Ratchet (75Nm)',
    sku: 'DNS-PT-M12FIR38',
    barcode: '8901020305100',
    locationId: 'WH-MAIN',
    locationName: 'Main Warehouse',
    binLocation: 'Power Tools Bay PT-04 / Shelf B',
    status: 'IN_STOCK',
    grnId: 'GRN-2025-PT04',
    grnNumber: 'GRN-2025-PT04',
    receivedDate: '2025-08-15T14:20:00Z',
    receivedBy: 'Amal Perera (Stock Keeper)',
  },
  {
    id: 'sn-pt-019',
    serialNumber: 'SN-BSH-GKS-101',
    productId: 'prod-pt-005',
    productName: 'Bosch GKS 190 Professional 1400W Circular Saw (190mm Blade)',
    sku: 'DNS-PT-GKS190',
    barcode: '8901020305056',
    locationId: 'WH-MAIN',
    locationName: 'Main Warehouse',
    binLocation: 'Power Tools Bay PT-01 / Shelf C',
    status: 'IN_STOCK',
    grnId: 'GRN-2025-PT01',
    grnNumber: 'GRN-2025-PT01',
    receivedDate: '2025-07-20T10:00:00Z',
    receivedBy: 'Amal Perera (Stock Keeper)',
  },
  {
    id: 'sn-pt-020',
    serialNumber: 'SN-DWT-DWE-701',
    productId: 'prod-pt-007',
    productName: 'DeWalt DWE492 2200W 230mm Heavy Duty Angle Grinder',
    sku: 'DNS-PT-DWE492',
    barcode: '8901020305070',
    locationId: 'WH-MAIN',
    locationName: 'Main Warehouse',
    binLocation: 'Power Tools Bay PT-03 / Shelf B',
    status: 'IN_STOCK',
    grnId: 'GRN-2025-PT03',
    grnNumber: 'GRN-2025-PT03',
    receivedDate: '2025-08-05T09:30:00Z',
    receivedBy: 'Amal Perera (Stock Keeper)',
  },
  {
    id: 'sn-pt-021',
    serialNumber: 'SN-MKT-RT-010',
    productId: 'prod-pt-009',
    productName: 'Makita RT0700C 710W Precision Router & Trimmer',
    sku: 'DNS-PT-RT0700',
    barcode: '8901020305094',
    locationId: 'WH-MAIN',
    locationName: 'Main Warehouse',
    binLocation: 'Power Tools Bay PT-02 / Shelf C',
    status: 'IN_STOCK',
    grnId: 'GRN-2025-PT02',
    grnNumber: 'GRN-2025-PT02',
    receivedDate: '2025-07-28T11:00:00Z',
    receivedBy: 'Amal Perera (Stock Keeper)',
  },
];

class SerialNumberService {
  private records: SerialNumberRecord[] = JSON.parse(JSON.stringify(INITIAL_SERIALS));

  public async getAll(): Promise<SerialNumberRecord[]> {
    return [...this.records];
  }

  public async getFiltered(params: {
    query?: string;
    status?: string;
    locationId?: string;
    productId?: string;
    grnId?: string;
  }): Promise<SerialNumberRecord[]> {
    let result = [...this.records];

    if (params.query?.trim()) {
      const q = params.query.toLowerCase().trim();
      result = result.filter(
        (r) =>
          r.serialNumber.toLowerCase().includes(q) ||
          r.productName.toLowerCase().includes(q) ||
          r.sku.toLowerCase().includes(q) ||
          (r.grnNumber && r.grnNumber.toLowerCase().includes(q)) ||
          (r.orderNumber && r.orderNumber.toLowerCase().includes(q)) ||
          (r.customerName && r.customerName.toLowerCase().includes(q)) ||
          r.barcode.includes(q)
      );
    }

    if (params.status && params.status !== 'ALL') {
      result = result.filter((r) => r.status === params.status);
    }

    if (params.locationId && params.locationId !== 'ALL') {
      result = result.filter((r) => r.locationId === params.locationId);
    }

    if (params.productId && params.productId !== 'ALL') {
      result = result.filter((r) => r.productId === params.productId);
    }

    if (params.grnId && params.grnId !== 'ALL') {
      result = result.filter((r) => r.grnId === params.grnId);
    }

    return result;
  }

  public async getBySerialNumber(serial: string): Promise<SerialNumberRecord | null> {
    const trimmed = serial.trim().toUpperCase();
    return this.records.find((r) => r.serialNumber.toUpperCase() === trimmed) || null;
  }

  public async registerBatch(params: {
    productId: string;
    locationId: string;
    locationName: string;
    binLocation?: string;
    grnId?: string;
    grnNumber?: string;
    receivedBy: string;
    serialNumbers: string[];
  }): Promise<{ registeredCount: number; duplicates: string[] }> {
    const product = MOCK_PRODUCTS.find((p) => p.id === params.productId);
    if (!product) throw new Error('Product not found');

    const duplicates: string[] = [];
    const validToAdd: string[] = [];

    params.serialNumbers.forEach((sn) => {
      const clean = sn.trim();
      if (!clean) return;
      if (this.records.some((r) => r.serialNumber.toUpperCase() === clean.toUpperCase())) {
        duplicates.push(clean);
      } else {
        validToAdd.push(clean);
      }
    });

    const now = new Date().toISOString();
    validToAdd.forEach((sn) => {
      this.records.unshift({
        id: `sn-auto-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        serialNumber: sn,
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        barcode: product.barcode,
        locationId: params.locationId,
        locationName: params.locationName,
        binLocation: params.binLocation || 'Warehouse General Bay',
        status: 'IN_STOCK',
        grnId: params.grnId,
        grnNumber: params.grnNumber,
        receivedDate: now,
        receivedBy: params.receivedBy,
      });
    });

    return { registeredCount: validToAdd.length, duplicates };
  }

  public async updateStatus(
    id: string,
    status: SerialNumberStatus,
    options?: { locationId?: string; locationName?: string; binLocation?: string; notes?: string }
  ): Promise<SerialNumberRecord> {
    const idx = this.records.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error('Serial number record not found');

    const updated: SerialNumberRecord = {
      ...this.records[idx],
      status,
      ...(options?.locationId && { locationId: options.locationId }),
      ...(options?.locationName && { locationName: options.locationName }),
      ...(options?.binLocation && { binLocation: options.binLocation }),
      ...(options?.notes !== undefined && { notes: options.notes }),
    };

    this.records[idx] = updated;
    return updated;
  }

  public async getSummary() {
    const total = this.records.length;
    const inStock = this.records.filter((r) => r.status === 'IN_STOCK').length;
    const allocated = this.records.filter((r) => r.status === 'ALLOCATED').length;
    const dispatched = this.records.filter((r) => r.status === 'DISPATCHED').length;
    const damaged = this.records.filter((r) => r.status === 'DAMAGED').length;

    return { total, inStock, allocated, dispatched, damaged };
  }

  public resetToDefaults() {
    this.records = JSON.parse(JSON.stringify(INITIAL_SERIALS));
  }
}

export const serialNumberService = new SerialNumberService();
