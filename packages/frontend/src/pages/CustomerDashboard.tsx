import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useDeliveryStore } from '../stores/deliveryStore';
import { Delivery, DeliveryStatus } from '@dts/shared';
import DeliveryCard from '../components/delivery/DeliveryCard';
import NotificationCenter from '../components/ui/NotificationCenter';
import { api } from '../services/api';
import {
  Package,
  Plus,
  LogOut,
  Search,
  Filter,
  CheckCircle,
  Truck,
  Clock,
  X,
} from 'lucide-react';

export const CustomerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { deliveries, isLoading, fetchDeliveries } = useDeliveryStore();

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New order form fields
  const [pickupStreet, setPickupStreet] = useState('');
  const [pickupCity, setPickupCity] = useState('Mumbai');
  const [destStreet, setDestStreet] = useState('');
  const [destCity, setDestCity] = useState('Mumbai');
  const [notes, setNotes] = useState('');
  const [amount, setAmount] = useState('150');

  useEffect(() => {
    fetchDeliveries();
  }, [fetchDeliveries]);

  const handleCreateDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Coords default to typical Mumbai coordinates if not picked on map
      const pickupLat = 19.1197 + (Math.random() - 0.5) * 0.02;
      const pickupLng = 72.8464 + (Math.random() - 0.5) * 0.02;
      const destLat = 19.0607 + (Math.random() - 0.5) * 0.02;
      const destLng = 72.8700 + (Math.random() - 0.5) * 0.02;

      const res = await api.createDelivery({
        pickupAddress: {
          label: 'Sender Location',
          street: pickupStreet,
          city: pickupCity,
          state: 'Maharashtra',
          lat: pickupLat,
          lng: pickupLng,
        },
        destinationAddress: {
          label: 'Customer Home',
          street: destStreet,
          city: destCity,
          state: 'Maharashtra',
          lat: destLat,
          lng: destLng,
        },
        notes,
        totalAmount: parseFloat(amount) || 120,
      });

      setIsModalOpen(false);
      setPickupStreet('');
      setDestStreet('');
      setNotes('');
      fetchDeliveries();

      const created: Delivery = res.data ?? res;
      if (created?.trackingNumber) {
        navigate(`/track/${created.trackingNumber}`);
      }
    } catch (err) {
      console.error('Failed to create delivery:', err);
      alert('Failed to create delivery. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredDeliveries = deliveries.filter((d) => {
    const matchesStatus =
      statusFilter === 'ALL'
        ? true
        : statusFilter === 'ACTIVE'
        ? [
            DeliveryStatus.ORDER_CREATED,
            DeliveryStatus.DRIVER_ASSIGNED,
            DeliveryStatus.DRIVER_ACCEPTED,
            DeliveryStatus.DRIVER_PICKED_UP,
            DeliveryStatus.IN_TRANSIT,
            DeliveryStatus.NEAR_DESTINATION,
          ].includes(d.status)
        : d.status === statusFilter;

    const matchesSearch =
      d.trackingNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.pickupAddress?.street?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.destinationAddress?.street?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  const activeCount = deliveries.filter((d) =>
    [
      DeliveryStatus.ORDER_CREATED,
      DeliveryStatus.DRIVER_ASSIGNED,
      DeliveryStatus.DRIVER_ACCEPTED,
      DeliveryStatus.DRIVER_PICKED_UP,
      DeliveryStatus.IN_TRANSIT,
      DeliveryStatus.NEAR_DESTINATION,
    ].includes(d.status)
  ).length;

  const completedCount = deliveries.filter((d) => d.status === DeliveryStatus.DELIVERED).length;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Navbar */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30 px-4 sm:px-8 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
            🚚
          </div>
          <div>
            <span className="font-bold text-gray-900 text-base">DTS Portal</span>
            <span className="text-[10px] text-primary-600 font-semibold uppercase tracking-wider block sm:inline sm:ml-2">
              Customer
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <NotificationCenter />
          <div className="h-6 w-px bg-gray-200" />
          <div className="flex items-center gap-2">
            <img
              src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`}
              alt={user?.name}
              className="w-8 h-8 rounded-full border border-gray-200 bg-gray-50"
            />
            <span className="hidden sm:inline text-xs font-semibold text-gray-800">
              {user?.name}
            </span>
          </div>
          <button
            onClick={logout}
            className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-gray-100 transition"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex-1">
        {/* Welcome Banner */}
        <div className="card p-6 mb-6 bg-gradient-to-r from-primary-900 via-indigo-900 to-primary-800 text-white shadow-md relative overflow-hidden">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold">Welcome back, {user?.name || 'Customer'}! 👋</h2>
              <p className="text-primary-200 text-sm mt-1">
                You have {activeCount} active deliveries on the way right now.
              </p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="btn-primary bg-white text-primary-900 hover:bg-primary-50 self-start sm:self-auto flex items-center gap-2 font-bold text-sm shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Book New Delivery</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
          <div className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">{deliveries.length}</div>
              <div className="text-xs text-gray-500">Total Deliveries</div>
            </div>
          </div>

          <div className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">{activeCount}</div>
              <div className="text-xs text-gray-500">In Transit</div>
            </div>
          </div>

          <div className="card p-4 flex items-center gap-3 col-span-2 sm:col-span-1">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">{completedCount}</div>
              <div className="text-xs text-gray-500">Completed</div>
            </div>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="card p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by tracking or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-9 text-xs py-2"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            <Filter className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            {['ALL', 'ACTIVE', 'DELIVERED'].map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  statusFilter === filter
                    ? 'bg-primary-600 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {filter === 'ALL' ? 'All Orders' : filter === 'ACTIVE' ? 'Active Orders' : 'Delivered'}
              </button>
            ))}
          </div>
        </div>

        {/* Deliveries List */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-36 skeleton rounded-xl" />
            <div className="h-36 skeleton rounded-xl" />
            <div className="h-36 skeleton rounded-xl" />
            <div className="h-36 skeleton rounded-xl" />
          </div>
        ) : filteredDeliveries.length === 0 ? (
          <div className="card p-12 text-center border-dashed border-2 border-gray-200">
            <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center mx-auto mb-3">
              <Package className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-gray-900 text-base mb-1">No deliveries found</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mb-4">
              {searchQuery || statusFilter !== 'ALL'
                ? 'Try adjusting your search criteria or status filter.'
                : "You don't have any active deliveries yet. Place your first delivery order now!"}
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="btn-primary text-xs inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Delivery</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredDeliveries.map((delivery) => (
              <DeliveryCard
                key={delivery.id}
                delivery={delivery}
                onClick={() => navigate(`/track/${delivery.trackingNumber}`)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Book New Delivery Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="card max-w-lg w-full p-6 shadow-2xl relative animate-in zoom-in-95">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-gray-900 mb-1">Place Delivery Order</h3>
            <p className="text-xs text-gray-500 mb-5">
              Enter the pickup and delivery destination details.
            </p>

            <form onSubmit={handleCreateDelivery} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Pickup Street / Landmark
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 14 Linking Road, Bandra West"
                  value={pickupStreet}
                  onChange={(e) => setPickupStreet(e.target.value)}
                  className="input text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Destination Address
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Flat 402, Sea Green Apts, Worli"
                  value={destStreet}
                  onChange={(e) => setDestStreet(e.target.value)}
                  className="input text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">City</label>
                  <select
                    value={destCity}
                    onChange={(e) => {
                      setDestCity(e.target.value);
                      setPickupCity(e.target.value);
                    }}
                    className="input text-xs"
                  >
                    <option value="Mumbai">Mumbai</option>
                    <option value="Delhi">Delhi</option>
                    <option value="Bangalore">Bangalore</option>
                    <option value="Hyderabad">Hyderabad</option>
                    <option value="Chennai">Chennai</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Delivery Fee (₹)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="input text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Special Instructions
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Please ring the doorbell twice, handle with care"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="input text-xs resize-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary text-xs flex items-center gap-1.5"
                >
                  {isSubmitting ? 'Creating Order...' : 'Confirm Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDashboard;

