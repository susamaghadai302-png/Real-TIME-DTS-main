import { create } from 'zustand';
import { Delivery, DeliveryStatus, ETAResult } from '@dts/shared';
import { api } from '../services/api';

interface DriverLocation {
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  timestamp?: string;
}

interface DeliveryState {
  deliveries: Delivery[];
  currentDelivery: Delivery | null;
  isLoading: boolean;
  error: string | null;
  driverLocation: DriverLocation | null;
  eta: ETAResult | null;
  total: number;
  page: number;
  hasMore: boolean;
}

interface DeliveryActions {
  fetchDeliveries: (params?: { page?: number; pageSize?: number; status?: string }) => Promise<void>;
  fetchDelivery: (id: string) => Promise<void>;
  trackDelivery: (trackingNumber: string) => Promise<Delivery>;
  updateDeliveryStatus: (id: string, status: DeliveryStatus, note?: string) => Promise<void>;
  setDriverLocation: (location: DriverLocation) => void;
  setETA: (eta: ETAResult) => void;
  setCurrentDelivery: (delivery: Delivery | null) => void;
  clearError: () => void;
  reset: () => void;
}

export const useDeliveryStore = create<DeliveryState & DeliveryActions>((set, get) => ({
  deliveries: [],
  currentDelivery: null,
  isLoading: false,
  error: null,
  driverLocation: null,
  eta: null,
  total: 0,
  page: 1,
  hasMore: false,

  fetchDeliveries: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.getDeliveries(params);
      const data = response.data ?? response;
      set({
        deliveries: data.items ?? data,
        total: data.total ?? 0,
        page: data.page ?? 1,
        hasMore: data.hasMore ?? false,
        isLoading: false,
      });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Failed to fetch deliveries';
      set({ isLoading: false, error: message });
    }
  },

  fetchDelivery: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.getDelivery(id);
      const delivery = response.data ?? response;
      set({ currentDelivery: delivery, isLoading: false });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Failed to fetch delivery';
      set({ isLoading: false, error: message });
    }
  },

  trackDelivery: async (trackingNumber: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.trackDelivery(trackingNumber);
      const delivery = response.data ?? response;
      set({ currentDelivery: delivery, isLoading: false });
      return delivery;
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Tracking number not found';
      set({ isLoading: false, error: message });
      throw new Error(message);
    }
  },

  updateDeliveryStatus: async (id: string, status: DeliveryStatus, note?: string) => {
    try {
      const response = await api.updateDeliveryStatus(id, status, note);
      const updated = response.data ?? response;
      const { deliveries, currentDelivery } = get();
      set({
        deliveries: deliveries.map((d) => (d.id === id ? updated : d)),
        currentDelivery: currentDelivery?.id === id ? updated : currentDelivery,
      });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Failed to update status';
      set({ error: message });
      throw new Error(message);
    }
  },

  setDriverLocation: (location: DriverLocation) => {
    set({ driverLocation: location });
  },

  setETA: (eta: ETAResult) => {
    set({ eta });
  },

  setCurrentDelivery: (delivery: Delivery | null) => {
    set({ currentDelivery: delivery });
  },

  clearError: () => set({ error: null }),

  reset: () =>
    set({
      deliveries: [],
      currentDelivery: null,
      isLoading: false,
      error: null,
      driverLocation: null,
      eta: null,
    }),
}));
