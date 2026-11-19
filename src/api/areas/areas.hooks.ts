import { useMutation, useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { areasApi } from './areas.api';
import {
  Area,
  CreateAreaPayload,
  ListAreasParams,
  PaginatedAreasResponse,
  UpdateAreaPayload,
  UpdateAreaStatusPayload,
} from './areas.types';

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
    staleTime: 60_000,
  });
}

export function useArea(id: string): UseQueryResult<Area, Error> {
  return useQuery({
    queryKey: areaQueryKeys.detail(id),
    queryFn: ({ signal }) => areasApi.getAreaById(id, signal),
    enabled: Boolean(id),
    staleTime: 60_000,
  });
}

export function useCreateArea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateAreaPayload) => areasApi.createArea(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: areaQueryKeys.lists() });
    },
  });
}

export function useUpdateArea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateAreaPayload }) =>
      areasApi.updateArea(id, payload),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: areaQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: areaQueryKeys.detail(id) });
    },
  });
}

export function useUpdateAreaStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateAreaStatusPayload }) =>
      areasApi.updateAreaStatus(id, payload),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: areaQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: areaQueryKeys.detail(id) });
    },
  });
}

export function useDeleteArea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => areasApi.deleteArea(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: areaQueryKeys.lists() });
    },
  });
}
