import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Pool, Conversation } from '@mindpool/shared';

export function useConversations() {
    return useQuery({
        queryKey: ['conversations'],
        queryFn: async () => {
            const data = await api.getConversations();
            return Array.isArray(data) ? (data as Conversation[]) : [];
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

export function usePools() {
    return useQuery({
        queryKey: ['pools'],
        queryFn: async () => {
            const data = await api.getPools();
            return Array.isArray(data) ? (data as Pool[]) : [];
        },
        staleTime: 1000 * 15, // 15 seconds (pools change more often with statuses)
    });
}
