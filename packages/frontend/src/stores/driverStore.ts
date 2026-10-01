import { create } from 'zustand';
import { Driver, Delivery, DriverStatus } from '@dts/shared';
import { api } from '../services/api';

interface DriverState {
  profile: Driver | null;
  activeDelivery: Delivery | null;
  locationSharingActive: boolean;
  isOnline: boolean;
  isLoading: boolean;
  error: string | null;
  todayStats: {
    assigned: number;
    completed: number;
    distanceKm: number;
    earnings: number;
    rating: number;
  };
}

interface DriverActions {
  fetchProfile: () => Promise<void>;
  setActiveDelivery: (delivery: Delivery | null) => void;
  setOnline: (online: boolean) => void;
  setLocationSharing: (active: boolean) => void;
  updateDriverStatus: (status: DriverStatus) => Promise<void>;
  clearError: () => void;
}

export const useDriverStore = create<DriverState & DriverActions>((set, get) => ({
  profile: null,
  activeDelivery: null,
  locationSharingActive: false,
  isOnline: false,
  isLoading: false,
  error: null,
  todayStats: {
    assigned: 0,
    completed: 0,
    distanceKm: 0,
    earnings: 0,
    rating: 5.0,
  },

  fetchProfile: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.getMyDriverProfile();
      const profile = response.data ?? response;
      set({
        profile,
        isOnline: profile.status !== 'OFFLINE',
        isLoading: false,
      });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Failed to fetch driver profile';
      set({ isLoading: false, error: message });
    }
  },

  setActiveDelivery: (delivery: Delivery | null) => {
    set({ activeDelivery: delivery });
  },

  setOnline: (online: boolean) => {
    set({ isOnline: online });
  },

  setLocationSharing: (active: boolean) => {
    set({ locationSharingActive: active });
  },

  updateDriverStatus: async (status: DriverStatus) => {
    const { profile } = get();
    if (!profile) return;
    try {
      await api.updateDriverStatus(profile.id, status);
      set({
        profile: { ...profile, status },
        isOnline: status !== DriverStatus.OFFLINE,
      });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Failed to update status';
      set({ error: message });
      throw new Error(message);
    }
  },

  clearError: () => set({ error: null }),
}));
