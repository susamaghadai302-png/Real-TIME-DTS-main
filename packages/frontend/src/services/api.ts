import axios, { AxiosInstance, AxiosError } from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      timeout: 15000,
      headers: { 'Content-Type': 'application/json' },
    });

    // Request interceptor: inject token
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('dts_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Response interceptor: handle 401
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('dts_token');
          localStorage.removeItem('dts_user');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth
  async login(email: string, password: string) {
    const { data } = await this.client.post('/api/auth/login', { email, password });
    return data;
  }

  async register(payload: {
    email: string;
    password: string;
    name: string;
    phone?: string;
    role: 'CUSTOMER' | 'DRIVER';
    vehicleType?: string;
    vehicleNumber?: string;
  }) {
    const { data } = await this.client.post('/api/auth/register', payload);
    return data;
  }

  async getMe() {
    const { data } = await this.client.get('/api/auth/me');
    return data;
  }

  // Deliveries
  async getDeliveries(params?: { page?: number; pageSize?: number; status?: string }) {
    const { data } = await this.client.get('/api/deliveries', { params });
    return data;
  }

  async getDelivery(id: string) {
    const { data } = await this.client.get(`/api/deliveries/${id}`);
    return data;
  }

  async trackDelivery(trackingNumber: string) {
    const { data } = await this.client.get(`/api/deliveries/track/${trackingNumber}`);
    return data;
  }

  async createDelivery(payload: {
    pickupAddress: { label?: string; street: string; city: string; state: string; lat: number; lng: number };
    destinationAddress: { label?: string; street: string; city: string; state: string; lat: number; lng: number };
    notes?: string;
    totalAmount?: number;
  }) {
    const { data } = await this.client.post('/api/deliveries', payload);
    return data;
  }

  async updateDeliveryStatus(id: string, status: string, note?: string) {
    const { data } = await this.client.patch(`/api/deliveries/${id}/status`, { status, note });
    return data;
  }

  async assignDriver(deliveryId: string, driverId: string) {
    const { data } = await this.client.post(`/api/deliveries/${deliveryId}/assign-driver`, { driverId });
    return data;
  }

  async getLocationHistory(deliveryId: string) {
    const { data } = await this.client.get(`/api/deliveries/${deliveryId}/location-history`);
    return data;
  }

  async getStatusHistory(deliveryId: string) {
    const { data } = await this.client.get(`/api/deliveries/${deliveryId}/status-history`);
    return data;
  }

  // Drivers
  async getDrivers(params?: { status?: string }) {
    const { data } = await this.client.get('/api/drivers', { params });
    return data;
  }

  async getDriver(id: string) {
    const { data } = await this.client.get(`/api/drivers/${id}`);
    return data;
  }

  async getMyDriverProfile() {
    const { data } = await this.client.get('/api/drivers/me');
    return data;
  }

  async updateDriverStatus(id: string, status: string) {
    const { data } = await this.client.patch(`/api/drivers/${id}/status`, { status });
    return data;
  }

  async updateDriverLocation(id: string, payload: {
    lat: number; lng: number; heading?: number; speed?: number; accuracy?: number; deliveryId?: string;
  }) {
    const { data } = await this.client.post(`/api/drivers/${id}/location`, payload);
    return data;
  }

  async getDriverDeliveries(id: string) {
    const { data } = await this.client.get(`/api/drivers/${id}/deliveries`);
    return data;
  }

  // Admin
  async getAdminStats() {
    const { data } = await this.client.get('/api/admin/stats');
    return data;
  }

  async getAdminDeliveries(params?: { page?: number; pageSize?: number; status?: string; driverId?: string }) {
    const { data } = await this.client.get('/api/admin/deliveries', { params });
    return data;
  }

  async getAdminDrivers() {
    const { data } = await this.client.get('/api/admin/drivers');
    return data;
  }

  async getAdminCustomers(params?: { page?: number; pageSize?: number }) {
    const { data } = await this.client.get('/api/admin/customers', { params });
    return data;
  }

  async getAnalytics() {
    const { data } = await this.client.get('/api/admin/analytics');
    return data;
  }

  // Notifications
  async getNotifications() {
    const { data } = await this.client.get('/api/notifications');
    return data;
  }

  async markNotificationRead(id: string) {
    const { data } = await this.client.patch(`/api/notifications/${id}/read`);
    return data;
  }

  async markAllNotificationsRead() {
    const { data } = await this.client.patch('/api/notifications/read-all');
    return data;
  }

  // Simulation
  async getSimulationRoutes() {
    const { data } = await this.client.get('/api/simulation/routes');
    return data;
  }

  async startSimulation(routeId: string, deliveryId?: string, speed?: number) {
    const { data } = await this.client.post('/api/simulation/start', { routeId, deliveryId, speed });
    return data;
  }

  async stopSimulation() {
    const { data } = await this.client.post('/api/simulation/stop');
    return data;
  }

  async getSimulationStatus() {
    const { data } = await this.client.get('/api/simulation/status');
    return data;
  }
}

export const api = new ApiClient();
