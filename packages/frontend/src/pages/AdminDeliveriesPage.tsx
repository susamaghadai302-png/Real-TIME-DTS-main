import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAdminStore } from '../stores/adminStore';
import { api } from '../services/api';
import { Delivery, DeliveryStatus, Driver } from '@dts/shared';
import StatusBadge from '../components/ui/StatusBadge';
import {
  Package,
  Search,
  Filter,
  ArrowLeft,
  UserPlus,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';

export const AdminDeliveriesPage: React.FC = () => {
  const { deliveries, deliveriesTotal, deliveriesPage, fetchDeliveries, fetchDrivers, drivers } =
    useAdminStore();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [assignModalDelivery, setAssignModalDelivery] = useState<Delivery | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState(false);

  useEffect(() => {
    fetchDeliveries({ page: 1, pageSize: 25 });
    fetchDrivers();
  }, [fetchDeliveries, fetchDrivers]);

  const handlePageChange = (newPage: number) => {
    fetchDeliveries({ page: newPage, pageSize: 25 });
  };

  const handleAssignDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignModalDelivery || !selectedDriverId) return;
    setIsAssigning(true);
    try {
      await api.assignDriver(assignModalDelivery.id, selectedDriverId);
      setAssignModalDelivery(null);
      setSelectedDriverId('');
      fetchDeliveries({ page: deliveriesPage, pageSize: 25 });
    } catch (err) {
      console.error(err);
      alert('Failed to assign driver.');
    } finally {
      setIsAssigning(false);
    }
  };

  const filtered = deliveries.filter((d) => {
    const matchStatus = statusFilter === 'ALL' || d.status === statusFilter;
    const matchSearch =
      d.trackingNumber.toLowerCase().includes(search.toLowerCase()) ||
      d.customer?.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
      d.pickupAddress?.city?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-100 px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-20 shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            to="/admin"
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-bold text-gray-900 text-base sm:text-lg">Delivery Orders Management</h1>
            <p className="text-xs text-gray-400">Total orders: {deliveriesTotal}</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-4 flex-1">
        {/* Filter bar */}
        <div className="card p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search tracking, customer, city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 text-xs py-2"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input text-xs py-2 w-auto"
            >
              <option value="ALL">All Statuses</option>
              <option value="ORDER_CREATED">Order Created</option>
              <option value="DRIVER_ASSIGNED">Driver Assigned</option>
              <option value="DRIVER_ACCEPTED">Driver Accepted</option>
              <option value="DRIVER_PICKED_UP">Picked Up</option>
              <option value="IN_TRANSIT">In Transit</option>
              <option value="NEAR_DESTINATION">Near Destination</option>
              <option value="DELIVERED">Delivered</option>
              <option value="DELAYED">Delayed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Orders Table */}
        <div className="card border border-gray-100 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-gray-50 text-gray-400 font-semibold uppercase text-[10px] tracking-wider border-b border-gray-100">
                <tr>
                  <th className="py-3.5 px-4">Tracking #</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Pickup</th>
                  <th className="py-3.5 px-4">Destination</th>
                  <th className="py-3.5 px-4">Driver</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50/70 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-primary-600">
                      {d.trackingNumber}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-gray-900">
                      {d.customer?.user?.name || 'Customer'}
                    </td>
                    <td className="py-3.5 px-4 text-gray-600 max-w-xs truncate">
                      {d.pickupAddress?.street}, {d.pickupAddress?.city}
                    </td>
                    <td className="py-3.5 px-4 text-gray-600 max-w-xs truncate">
                      {d.destinationAddress?.street}, {d.destinationAddress?.city}
                    </td>
                    <td className="py-3.5 px-4">
                      {d.driver ? (
                        <span className="font-semibold text-gray-800">
                          {d.driver.user?.name || 'Driver'}
                        </span>
                      ) : (
                        <button
                          onClick={() => setAssignModalDelivery(d)}
                          className="btn-secondary text-[11px] py-1 px-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50 flex items-center gap-1 font-medium"
                        >
                          <UserPlus className="w-3 h-3" />
                          <span>Assign</span>
                        </button>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={d.status} />
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-gray-900">
                      ₹{d.totalAmount || 120}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <a
                        href={`/track/${d.trackingNumber}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:text-primary-800 inline-flex items-center gap-1 font-semibold"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Track</span>
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <div>
              Showing page <span className="font-bold">{deliveriesPage}</span> of{' '}
              <span className="font-bold">{Math.ceil(deliveriesTotal / 25) || 1}</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handlePageChange(deliveriesPage - 1)}
                disabled={deliveriesPage <= 1}
                className="p-1.5 rounded border border-gray-200 disabled:opacity-30 hover:bg-gray-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => handlePageChange(deliveriesPage + 1)}
                disabled={deliveriesPage * 25 >= deliveriesTotal}
                className="p-1.5 rounded border border-gray-200 disabled:opacity-30 hover:bg-gray-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Driver Assignment Modal */}
      {assignModalDelivery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="card max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setAssignModalDelivery(null)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-gray-900 mb-1">Assign Courier to Order</h3>
            <p className="text-xs text-gray-500 mb-4">
              Order #{assignModalDelivery.trackingNumber} ({assignModalDelivery.pickupAddress?.city})
            </p>

            <form onSubmit={handleAssignDriver} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Select Courier
                </label>
                <select
                  required
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                  className="input text-xs"
                >
                  <option value="">-- Choose Available Driver --</option>
                  {drivers.map((drv) => (
                    <option key={drv.id} value={drv.id}>
                      {drv.user?.name || 'Driver'} ({drv.vehicleNumber} - {drv.status})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setAssignModalDelivery(null)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAssigning || !selectedDriverId}
                  className="btn-primary text-xs"
                >
                  {isAssigning ? 'Assigning...' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDeliveriesPage;

