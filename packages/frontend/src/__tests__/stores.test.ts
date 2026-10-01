import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../stores/authStore';
import { useDeliveryStore } from '../stores/deliveryStore';
import { DeliveryStatus, UserRole } from '@dts/shared';

// Mock localStorage for Node test runner
const storage: Record<string, string> = {};
global.localStorage = {
  getItem: (key: string) => storage[key] || null,
  setItem: (key: string, val: string) => { storage[key] = val; },
  removeItem: (key: string) => { delete storage[key]; },
  clear: () => { Object.keys(storage).forEach((k) => delete storage[k]); },
  length: 0,
  key: () => null,
} as unknown as Storage;

describe('Frontend Stores', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.getState().logout();
    useDeliveryStore.getState().reset();
  });

  describe('AuthStore', () => {
    it('initializes with unauthenticated state', () => {
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
    });

    it('sets user and updates localStorage', () => {
      const mockUser = {
        id: 'usr-123',
        email: 'customer@dts.dev',
        name: 'Arjun Mehta',
        role: UserRole.CUSTOMER,
        createdAt: new Date().toISOString(),
      };

      useAuthStore.getState().setUser(mockUser);
      expect(useAuthStore.getState().user?.email).toBe('customer@dts.dev');
      expect(localStorage.getItem('dts_user')).toContain('customer@dts.dev');
    });

    it('clears session on logout', () => {
      const mockUser = {
        id: 'usr-123',
        email: 'customer@dts.dev',
        name: 'Arjun Mehta',
        role: UserRole.CUSTOMER,
        createdAt: new Date().toISOString(),
      };
      useAuthStore.getState().setUser(mockUser);
      useAuthStore.getState().logout();

      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().user).toBeNull();
      expect(localStorage.getItem('dts_token')).toBeNull();
    });
  });

  describe('DeliveryStore', () => {
    it('updates driver live location', () => {
      useDeliveryStore.getState().setDriverLocation({
        lat: 19.0760,
        lng: 72.8777,
        heading: 90,
        speed: 35,
      });

      const loc = useDeliveryStore.getState().driverLocation;
      expect(loc).toBeDefined();
      expect(loc?.lat).toBe(19.0760);
      expect(loc?.heading).toBe(90);
      expect(loc?.speed).toBe(35);
    });

    it('updates live ETA', () => {
      const eta = {
        distanceKm: 3.5,
        minutes: 12,
        arrivalTime: new Date().toISOString(),
      };
      useDeliveryStore.getState().setETA(eta);

      expect(useDeliveryStore.getState().eta?.minutes).toBe(12);
      expect(useDeliveryStore.getState().eta?.distanceKm).toBe(3.5);
    });
  });
});
