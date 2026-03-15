import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Conversation } from '@mindpool/shared';

export function useConversations() {
    return useInfiniteQuery({
        queryKey: ['conversations'],
        queryFn: async ({ pageParam }) => {
            return api.getConversations(pageParam as string | undefined);
        },
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
        staleTime: 1000 * 60 * 5,
        refetchInterval: (query) => {
            const pages = query.state.data?.pages;
            if (pages?.some((p) => p.items.some((c: Conversation) => c.title === 'Cuộc trò chuyện mới'))) {
                return 5000;
            }
            return false;
        },
        select: (data) => ({
            ...data,
            items: data.pages.flatMap((p) => p.items),
        }),
    });
}

export function usePools() {
    return useInfiniteQuery({
        queryKey: ['pools'],
        queryFn: async ({ pageParam }) => {
            return api.getPools(pageParam as string | undefined);
        },
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
        staleTime: 1000 * 15,
        select: (data) => ({
            ...data,
            items: data.pages.flatMap((p) => p.items),
        }),
    });
}
