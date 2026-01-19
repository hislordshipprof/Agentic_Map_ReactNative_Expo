/**
 * TanStack Query hooks for API calls.
 * Pattern hooks: useAnchors (useQuery), useNavigateWithStops (useMutation).
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import { userApi } from './user';
import { errandApi } from './errand';
import type { NavigateWithStopsRequest, NavigateWithStopsData } from '@/types/api';
import type { Anchor } from '@/types/user';

export function useAnchors() {
  return useQuery({
    queryKey: queryKeys.anchors(),
    queryFn: async (): Promise<Anchor[]> => {
      const res = await userApi.getAnchors();
      if (!res.success) throw res.error;
      return res.data?.anchors ?? [];
    },
    staleTime: 10 * 60 * 1000, // 10 min
  });
}

export function useNavigateWithStops() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: NavigateWithStopsRequest): Promise<NavigateWithStopsData> => {
      const res = await errandApi.navigateWithStops(body);
      if (!res.success) throw res.error;
      return (res.data as unknown) as NavigateWithStopsData;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.all });
    },
  });
}
