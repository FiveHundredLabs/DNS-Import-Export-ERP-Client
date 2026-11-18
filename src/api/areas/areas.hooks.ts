import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { areasApi } from './areas.api';
import { Area, ListAreasParams, PaginatedAreasResponse } from './areas.types';

export const areaQueryKeys = {
  all: ['areas'] as const,
  lists: () => [...areaQueryKeys.all, 'list'] as const,
  list: (params?: ListAreasParams) => [...areaQueryKeys.lists(), params] as const,
  details: () => [...areaQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...areaQueryKeys.details(), id] as const,
};

export function useAreas(params?: ListAreasParams): UseQueryResult<PaginatedAreasResponse, Error> {
  return useQuery({
    queryKey: areaQueryKeys.list(params),
    queryFn: ({ signal }) => areasApi.listAreas(params, signal),
    staleTime: 300_000, // Areas are reference data — 5 min cache
  });
}

export function useArea(id: string): UseQueryResult<Area, Error> {
  return useQuery({
    queryKey: areaQueryKeys.detail(id),
    queryFn: ({ signal }) => areasApi.getAreaById(id, signal),
    enabled: Boolean(id),
    staleTime: 300_000,
  });
}
