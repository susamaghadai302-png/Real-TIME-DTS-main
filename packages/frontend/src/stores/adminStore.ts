import { create } from 'zustand';
import { AdminStats, Delivery, Driver } from '@dts/shared';
import { api } from '../services/api';

interface AdminState {
  stats: AdminStats | null;
  deliveries: Delivery[];
  drivers: Driver[];
  isLoading: boolean;
  error: string | null;
  deliveriesTotal: number;
  deliveriesPage: number;
}

interface AdminActions {
  fetchStats: () => Promise<void>;
  fetchDeliveries: (params?: { page?: number; pageSize?: number; status?: string }) => Promise<void>;
  fetchDrivers: () => Promise<void>;
  assignDriver: (deliveryId: string, driverId: string) => Promise<void>;
  clearError: () => void;
}

export const useAdminStore = create<AdminState & AdminActions>((set) => ({
  stats: null,
  deliveries: [],
  drivers: [],
  isLoading: false,
  error: null,
  deliveriesTotal: 0,
  deliveriesPage: 1,

  fetchStats: async () => {
    try {
      const response = await api.getAdminStats();
      const stats = response.data ?? response;
      set({ stats });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Failed to fetch stats';
      set({ error: message });
    }
  },

  fetchDeliveries: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.getAdminDeliveries(params);
      const data = response.data ?? response;
      set({
        deliveries: data.items ?? data,
        deliveriesTotal: data.total ?? 0,
        deliveriesPage: data.page ?? 1,
        isLoading: false,
      });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Failed to fetch deliveries';
      set({ isLoading: false, error: message });
    }
  },

  fetchDrivers: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.getAdminDrivers();
      const data = response.data ?? response;
      set({ drivers: Array.isArray(data) ? data : data.items ?? [], isLoading: false });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Failed to fetch drivers';
      set({ isLoading: false, error: message });
    }
  },

  assignDriver: async (deliveryId: string, driverId: string) => {
    try {
      await api.assignDriver(deliveryId, driverId);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Failed to assign driver';
      set({ error: message });
      throw new Error(message);
    }
  },

  clearError: () => set({ error: null }),
}));
