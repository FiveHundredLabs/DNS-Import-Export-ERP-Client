import { BaseEntity } from '../types/common';

export interface Area extends BaseEntity {
  code: string;
  name: string;
  region: string;
  areaManagerId: string;
  areaManagerName: string;
  salesManagerId: string;
  salesManagerName: string;
}

export const MOCK_AREAS: Area[] = [
  {
    id: 'area-01',
    code: 'WP-CTR',
    name: 'Western Province Central',
    region: 'Colombo & Suburbs',
    areaManagerId: 'usr-105',
    areaManagerName: 'Nimal Bandara',
    salesManagerId: 'usr-103',
    salesManagerName: 'Kamal Perera',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'area-02',
    code: 'CP-KDY',
    name: 'Central Province Kandy',
    region: 'Kandy & Matale',
    areaManagerId: 'usr-105',
    areaManagerName: 'Nimal Bandara',
    salesManagerId: 'usr-103',
    salesManagerName: 'Kamal Perera',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'area-03',
    code: 'SP-GLE',
    name: 'Southern Province Galle',
    region: 'Galle & Matara',
    areaManagerId: 'usr-105',
    areaManagerName: 'Nimal Bandara',
    salesManagerId: 'usr-103',
    salesManagerName: 'Kamal Perera',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
];
