import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Driver, DriverStatus } from '@dts/shared';

// Helper component to smoothly center/fit bounds
function MapUpdater({
  driverLocation,
  pickupLocation,
  destinationLocation,
  autoCenter = true,
}: {
  driverLocation?: { lat: number; lng: number };
  pickupLocation?: { lat: number; lng: number };
  destinationLocation?: { lat: number; lng: number };
  autoCenter?: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (!autoCenter) return;

    if (driverLocation && destinationLocation) {
      const bounds = L.latLngBounds([
        [driverLocation.lat, driverLocation.lng],
        [destinationLocation.lat, destinationLocation.lng],
      ]);
      if (pickupLocation) {
        bounds.extend([pickupLocation.lat, pickupLocation.lng]);
      }
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    } else if (driverLocation) {
      map.panTo([driverLocation.lat, driverLocation.lng], { animate: true });
    } else if (destinationLocation) {
      map.setView([destinationLocation.lat, destinationLocation.lng], 14);
    }
  }, [driverLocation?.lat, driverLocation?.lng, destinationLocation?.lat, destinationLocation?.lng, map, autoCenter]);

  return null;
}

export interface MapViewProps {
  driverLocation?: {
    lat: number;
    lng: number;
    heading?: number;
    speed?: number;
  } | null;
  pickupLocation?: {
    lat: number;
    lng: number;
    label?: string;
  } | null;
  destinationLocation?: {
    lat: number;
    lng: number;
    label?: string;
  } | null;
  drivers?: Driver[];
  onDriverClick?: (driver: Driver) => void;
  className?: string;
  height?: string;
  zoom?: number;
  center?: [number, number];
  interactive?: boolean;
  showRouteLine?: boolean;
}

export const MapView: React.FC<MapViewProps> = ({
  driverLocation,
  pickupLocation,
  destinationLocation,
  drivers = [],
  onDriverClick,
  className = '',
  height = '100%',
  zoom = 13,
  center = [19.0760, 72.8777], // Default Mumbai
  interactive = true,
  showRouteLine = true,
}) => {
  // Determine initial center
  const initialCenter: [number, number] = useMemo(() => {
    if (driverLocation) return [driverLocation.lat, driverLocation.lng];
    if (destinationLocation) return [destinationLocation.lat, destinationLocation.lng];
    if (pickupLocation) return [pickupLocation.lat, pickupLocation.lng];
    if (drivers.length > 0 && drivers[0].currentLat && drivers[0].currentLng) {
      return [drivers[0].currentLat, drivers[0].currentLng];
    }
    return center;
  }, [driverLocation, destinationLocation, pickupLocation, drivers, center]);

  // Create Custom HTML Markers using L.divIcon
  const createDriverIcon = (heading: number = 0, status?: string) => {
    let bgColor = '#4F46E5'; // Default indigo
    if (status === 'AVAILABLE') bgColor = '#10B981'; // Green
    if (status === 'BUSY') bgColor = '#3B82F6'; // Blue
    if (status === 'DELAYED') bgColor = '#F59E0B'; // Yellow
    if (status === 'OFFLINE') bgColor = '#6B7280'; // Gray

    return L.divIcon({
      className: 'custom-driver-icon',
      html: `
        <div style="
          width: 42px;
          height: 42px;
          background: ${bgColor};
          border: 3px solid #FFFFFF;
          border-radius: 50%;
          box-shadow: 0 4px 14px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          transform: rotate(${heading}deg);
          transition: transform 0.4s ease-out;
        ">
          <span style="font-size: 20px; user-select: none;">🛵</span>
        </div>
      `,
      iconSize: [42, 42],
      iconAnchor: [21, 21],
    });
  };

  const pickupIcon = L.divIcon({
    className: 'custom-pickup-icon',
    html: `
      <div style="
        width: 38px;
        height: 38px;
        background: #10B981;
        border: 3px solid #FFFFFF;
        border-radius: 50%;
        box-shadow: 0 4px 12px rgba(0,0,0,0.25);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <span style="font-size: 18px; user-select: none;">🏪</span>
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  });

  const destinationIcon = L.divIcon({
    className: 'custom-dest-icon',
    html: `
      <div style="
        width: 38px;
        height: 38px;
        background: #EF4444;
        border: 3px solid #FFFFFF;
        border-radius: 50%;
        box-shadow: 0 4px 12px rgba(0,0,0,0.25);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <span style="font-size: 18px; user-select: none;">📍</span>
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  });

  // Calculate route polyline points
  const routePoints: [number, number][] = useMemo(() => {
    if (!showRouteLine) return [];
    const pts: [number, number][] = [];
    if (pickupLocation) pts.push([pickupLocation.lat, pickupLocation.lng]);
    if (driverLocation) pts.push([driverLocation.lat, driverLocation.lng]);
    if (destinationLocation) pts.push([destinationLocation.lat, destinationLocation.lng]);
    return pts;
  }, [pickupLocation, driverLocation, destinationLocation, showRouteLine]);

  return (
    <div style={{ height, width: '100%', position: 'relative' }} className={`overflow-hidden rounded-xl ${className}`}>
      <MapContainer
        center={initialCenter}
        zoom={zoom}
        style={{ height: '100%', width: '100%', zIndex: 10 }}
        zoomControl={interactive}
        scrollWheelZoom={interactive}
        dragging={interactive}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        <MapUpdater
          driverLocation={driverLocation || undefined}
          pickupLocation={pickupLocation || undefined}
          destinationLocation={destinationLocation || undefined}
          autoCenter={interactive}
        />

        {/* Pickup Marker */}
        {pickupLocation && (
          <Marker position={[pickupLocation.lat, pickupLocation.lng]} icon={pickupIcon}>
            <Popup>
              <div className="p-1 text-xs">
                <div className="font-bold text-emerald-700">Pickup Location</div>
                <div>{pickupLocation.label || 'Pickup point'}</div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Destination Marker */}
        {destinationLocation && (
          <Marker position={[destinationLocation.lat, destinationLocation.lng]} icon={destinationIcon}>
            <Popup>
              <div className="p-1 text-xs">
                <div className="font-bold text-rose-700">Customer Destination</div>
                <div>{destinationLocation.label || 'Delivery address'}</div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Single Driver Marker (Customer / Driver view) */}
        {driverLocation && (
          <Marker
            position={[driverLocation.lat, driverLocation.lng]}
            icon={createDriverIcon(driverLocation.heading || 0, 'BUSY')}
          >
            <Popup>
              <div className="p-1 text-xs">
                <div className="font-bold text-indigo-700">Courier Location</div>
                {driverLocation.speed !== undefined && (
                  <div>Speed: {Math.round(driverLocation.speed)} km/h</div>
                )}
                {driverLocation.heading !== undefined && (
                  <div>Heading: {Math.round(driverLocation.heading)}°</div>
                )}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Multiple Driver Markers (Admin Fleet view) */}
        {drivers.map((drv) => {
          if (!drv.currentLat || !drv.currentLng) return null;
          return (
            <Marker
              key={drv.id}
              position={[drv.currentLat, drv.currentLng]}
              icon={createDriverIcon(0, drv.status)}
              eventHandlers={{
                click: () => onDriverClick && onDriverClick(drv),
              }}
            >
              <Popup>
                <div className="p-1.5 text-xs">
                  <div className="font-bold text-gray-900">{drv.user?.name || 'Driver'}</div>
                  <div className="text-gray-500">Status: <span className="font-semibold">{drv.status}</span></div>
                  <div className="text-gray-500">Vehicle: {drv.vehicleNumber} ({drv.vehicleType})</div>
                  <div className="text-gray-500">Rating: ★ {drv.rating}</div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Route Polyline */}
        {routePoints.length > 1 && (
          <Polyline
            positions={routePoints}
            pathOptions={{
              color: '#4F46E5',
              weight: 4,
              opacity: 0.8,
              dashArray: '6, 8',
            }}
          />
        )}
      </MapContainer>
    </div>
  );
};

export default MapView;

