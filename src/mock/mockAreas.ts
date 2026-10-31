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
    code: 'KEL',
    name: 'Kelaniya',
    region: 'Colombo North / Gampaha',
    areaManagerId: 'usr-105',
    areaManagerName: 'Nimal Bandara',
    salesManagerId: 'usr-103',
    salesManagerName: 'Kamal Perera',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'area-02',
    code: 'MHR',
    name: 'Maharagama',
    region: 'Colombo South / High Level',
    areaManagerId: 'usr-105',
    areaManagerName: 'Nimal Bandara',
    salesManagerId: 'usr-103',
    salesManagerName: 'Kamal Perera',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'area-03',
    code: 'MLB',
    name: 'Malabe',
    region: 'Colombo East / Kaduwela',
    areaManagerId: 'usr-105',
    areaManagerName: 'Nimal Bandara',
    salesManagerId: 'usr-103',
    salesManagerName: 'Kamal Perera',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'area-04',
    code: 'KOT',
    name: 'Kottawa',
    region: 'Colombo South / Homagama',
    areaManagerId: 'usr-105',
    areaManagerName: 'Nimal Bandara',
    salesManagerId: 'usr-103',
    salesManagerName: 'Kamal Perera',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
];
