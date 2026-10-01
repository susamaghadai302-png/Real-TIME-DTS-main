/**
 * Database Seed Script
 * Seeds demo data: 20 customers, 15 drivers, 50 deliveries with Indian addresses and realistic location history.
 * Run with: npx ts-node src/db/seed.ts
 * Idempotent: deletes all existing data before seeding.
 */

import { prisma } from './client';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';

const SALT_ROUNDS = 12;

// ─────────────────────────────────────────────────────────────
// DATA POOLS
// ─────────────────────────────────────────────────────────────

const INDIAN_MALE_NAMES = [
  'Arjun Sharma', 'Rohit Mehta', 'Vikram Patel', 'Suresh Iyer', 'Kiran Rao',
  'Anil Kumar', 'Deepak Gupta', 'Rajesh Singh', 'Manish Verma', 'Pradeep Nair',
  'Gaurav Joshi', 'Amit Tiwari', 'Sanjay Bhat', 'Nikhil Desai', 'Ravi Krishnan',
];

const INDIAN_FEMALE_NAMES = [
  'Priya Sharma', 'Anjali Patel', 'Neha Gupta', 'Sunita Rao', 'Kavya Nair',
  'Pooja Mehta', 'Divya Iyer', 'Sneha Joshi', 'Rekha Singh', 'Meera Bhat',
  'Ananya Verma', 'Swati Tiwari', 'Leela Krishnan', 'Nandita Desai', 'Shruti Kumar',
  'Bhavna Agarwal', 'Rashida Sheikh', 'Fatima Khan', 'Lakshmi Pillai', 'Geeta Chauhan',
];

const ALL_NAMES = [...INDIAN_MALE_NAMES, ...INDIAN_FEMALE_NAMES];

const DRIVER_VEHICLES: Array<{ type: string; number: string }> = [
  { type: 'BIKE',   number: 'MH-01-AB-1234' },
  { type: 'SCOOTER', number: 'DL-05-CD-5678' },
  { type: 'BIKE',   number: 'KA-03-EF-9012' },
  { type: 'CAR',    number: 'TN-09-GH-3456' },
  { type: 'SCOOTER', number: 'TS-07-IJ-7890' },
  { type: 'BIKE',   number: 'MH-02-KL-2345' },
  { type: 'VAN',    number: 'DL-08-MN-6789' },
  { type: 'BIKE',   number: 'KA-04-OP-1357' },
  { type: 'SCOOTER', number: 'TN-06-QR-2468' },
  { type: 'CAR',    number: 'TS-11-ST-3579' },
  { type: 'BIKE',   number: 'MH-12-UV-4680' },
  { type: 'SCOOTER', number: 'DL-03-WX-5791' },
  { type: 'BIKE',   number: 'KA-07-YZ-6802' },
  { type: 'CAR',    number: 'TN-04-AA-7913' },
  { type: 'BIKE',   number: 'TS-09-BB-8024' },
];

interface CityAddress {
  label: string;
  street: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
}

const ADDRESSES: CityAddress[] = [
  // Mumbai – Andheri
  { label: 'Andheri West',       street: '14, Versova Road, Andheri West',          city: 'Mumbai',    state: 'Maharashtra', lat: 19.1321, lng: 72.8258 },
  { label: 'Andheri East',       street: '22, MIDC Industrial Area, Andheri East',  city: 'Mumbai',    state: 'Maharashtra', lat: 19.1174, lng: 72.8591 },
  // Mumbai – Bandra
  { label: 'Bandra West',        street: '5, Hill Road, Bandra West',               city: 'Mumbai',    state: 'Maharashtra', lat: 19.0596, lng: 72.8295 },
  { label: 'Bandra East',        street: '33, Kurla Road, Bandra East',             city: 'Mumbai',    state: 'Maharashtra', lat: 19.0607, lng: 72.8530 },
  // Mumbai – Dadar
  { label: 'Dadar',              street: '7, Gokhale Road, Dadar West',             city: 'Mumbai',    state: 'Maharashtra', lat: 19.0183, lng: 72.8411 },
  // Mumbai – Kurla
  { label: 'Kurla West',         street: '18, LBS Road, Kurla West',                city: 'Mumbai',    state: 'Maharashtra', lat: 19.0706, lng: 72.8781 },
  // Mumbai – Powai
  { label: 'Powai',              street: '101, Hiranandani Gardens, Powai',          city: 'Mumbai',    state: 'Maharashtra', lat: 19.1176, lng: 72.9060 },
  // Delhi – Connaught Place
  { label: 'Connaught Place',    street: 'Block A, Connaught Place',                city: 'New Delhi', state: 'Delhi',       lat: 28.6330, lng: 77.2194 },
  // Delhi – Hauz Khas
  { label: 'Hauz Khas',          street: '12, Hauz Khas Village',                   city: 'New Delhi', state: 'Delhi',       lat: 28.5535, lng: 77.2000 },
  // Delhi – Lajpat Nagar
  { label: 'Lajpat Nagar',       street: '45, Central Market, Lajpat Nagar',        city: 'New Delhi', state: 'Delhi',       lat: 28.5685, lng: 77.2430 },
  // Delhi – Dwarka
  { label: 'Dwarka Sector 12',   street: '9, Dwarka Sector 12 Market',              city: 'New Delhi', state: 'Delhi',       lat: 28.5921, lng: 77.0460 },
  // Delhi – Rohini
  { label: 'Rohini Sector 9',    street: '32, Rohini Sector 9',                     city: 'New Delhi', state: 'Delhi',       lat: 28.7091, lng: 77.1167 },
  // Bangalore – Koramangala
  { label: 'Koramangala 5th Block', street: '80 Feet Road, Koramangala 5th Block',  city: 'Bengaluru', state: 'Karnataka',   lat: 12.9352, lng: 77.6245 },
  // Bangalore – Indiranagar
  { label: 'Indiranagar',        street: '100 Feet Road, Indiranagar',              city: 'Bengaluru', state: 'Karnataka',   lat: 12.9784, lng: 77.6408 },
  // Bangalore – Whitefield
  { label: 'Whitefield',         street: 'EPIP Zone, Whitefield',                   city: 'Bengaluru', state: 'Karnataka',   lat: 12.9698, lng: 77.7500 },
  // Bangalore – HSR Layout
  { label: 'HSR Layout',         street: '27th Main, HSR Layout',                   city: 'Bengaluru', state: 'Karnataka',   lat: 12.9116, lng: 77.6389 },
  // Bangalore – Jayanagar
  { label: 'Jayanagar 4th Block', street: '11th Main, Jayanagar 4th Block',         city: 'Bengaluru', state: 'Karnataka',   lat: 12.9308, lng: 77.5831 },
  // Hyderabad – Jubilee Hills
  { label: 'Jubilee Hills',      street: 'Road No. 36, Jubilee Hills',              city: 'Hyderabad', state: 'Telangana',   lat: 17.4239, lng: 78.4072 },
  // Hyderabad – Banjara Hills
  { label: 'Banjara Hills',      street: 'Road No. 12, Banjara Hills',              city: 'Hyderabad', state: 'Telangana',   lat: 17.4156, lng: 78.4347 },
  // Hyderabad – Hitech City
  { label: 'Hitech City',        street: 'Cyber Towers, Hitech City',               city: 'Hyderabad', state: 'Telangana',   lat: 17.4488, lng: 78.3832 },
  // Hyderabad – Gachibowli
  { label: 'Gachibowli',         street: 'Financial District, Gachibowli',          city: 'Hyderabad', state: 'Telangana',   lat: 17.4401, lng: 78.3489 },
  // Chennai – T Nagar
  { label: 'T Nagar',            street: 'Usman Road, T Nagar',                     city: 'Chennai',   state: 'Tamil Nadu',  lat: 13.0418, lng: 80.2341 },
  // Chennai – Adyar
  { label: 'Adyar',              street: 'LB Road, Adyar',                          city: 'Chennai',   state: 'Tamil Nadu',  lat: 13.0012, lng: 80.2565 },
  // Chennai – Anna Nagar
  { label: 'Anna Nagar',         street: '2nd Avenue, Anna Nagar',                  city: 'Chennai',   state: 'Tamil Nadu',  lat: 13.0891, lng: 80.2099 },
  // Chennai – Velachery
  { label: 'Velachery',          street: 'Velachery Main Road',                     city: 'Chennai',   state: 'Tamil Nadu',  lat: 12.9815, lng: 80.2180 },
];

type StatusBucket = {
  status: string;
  count: number;
  needsDriver: boolean;
  needsLocation: boolean;
};

const STATUS_BUCKETS: StatusBucket[] = [
  { status: 'ORDER_CREATED',    count: 5,  needsDriver: false, needsLocation: false },
  { status: 'DRIVER_ASSIGNED',  count: 5,  needsDriver: true,  needsLocation: false },
  { status: 'DRIVER_ACCEPTED',  count: 5,  needsDriver: true,  needsLocation: false },
  { status: 'DRIVER_PICKED_UP', count: 5,  needsDriver: true,  needsLocation: false },
  { status: 'IN_TRANSIT',       count: 5,  needsDriver: true,  needsLocation: true  },
  { status: 'NEAR_DESTINATION', count: 2,  needsDriver: true,  needsLocation: true  },
  { status: 'DELIVERED',        count: 20, needsDriver: true,  needsLocation: false },
  { status: 'CANCELLED',        count: 3,  needsDriver: false, needsLocation: false },
];

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomFloat(min: number, max: number): number {
  return Math.round((min + Math.random() * (max - min)) * 100) / 100;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function trackingNumber(): string {
  const prefix = ['DTS', 'TRK', 'EXP', 'ZOM', 'SWG'][randomInt(0, 4)];
  return `${prefix}${Date.now().toString().slice(-6)}${randomInt(100, 999)}`;
}

/** Generate a series of interpolated lat/lng points simulating a GPS route */
function generateLocationHistory(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  count: number,
  startMinsAgo: number,
): Array<{ lat: number; lng: number; heading: number; speed: number; accuracy: number; timestamp: Date }> {
  const history: Array<{ lat: number; lng: number; heading: number; speed: number; accuracy: number; timestamp: Date }> = [];
  const now = Date.now();
  const startMs = now - startMinsAgo * 60 * 1000;
  const intervalMs = count > 1 ? (startMinsAgo * 60 * 1000) / (count - 1) : 0;

  // Pre-compute heading from start to destination
  const dLngRad = (toLng - fromLng) * (Math.PI / 180);
  const y = Math.sin(dLngRad) * Math.cos(toLat * (Math.PI / 180));
  const x =
    Math.cos(fromLat * (Math.PI / 180)) * Math.sin(toLat * (Math.PI / 180)) -
    Math.sin(fromLat * (Math.PI / 180)) * Math.cos(toLat * (Math.PI / 180)) * Math.cos(dLngRad);
  const heading = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;

  for (let i = 0; i < count; i++) {
    const t = count > 1 ? i / (count - 1) : 1;
    const lat = fromLat + (toLat - fromLat) * t + (Math.random() - 0.5) * 0.0002;
    const lng = fromLng + (toLng - fromLng) * t + (Math.random() - 0.5) * 0.0002;

    history.push({
      lat,
      lng,
      heading,
      speed:    randomFloat(15, 50),
      accuracy: randomFloat(5, 20),
      timestamp: new Date(startMs + i * intervalMs),
    });
  }

  return history;
}

// ─────────────────────────────────────────────────────────────
// MAIN SEED
// ─────────────────────────────────────────────────────────────

async function seed() {
  console.log('🌱 Starting database seed...\n');

  // ── 1. Wipe all existing data (order matters for FK constraints) ──
  console.log('🗑️  Clearing existing data...');
  await prisma.notification.deleteMany();
  await prisma.deliveryStatusHistory.deleteMany();
  await prisma.locationUpdate.deleteMany();
  await prisma.delivery.deleteMany();
  await prisma.address.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.user.deleteMany();
  console.log('   Done.\n');

  // ── 2. Hash passwords ──
  const adminHash    = await bcrypt.hash('Admin@123',    SALT_ROUNDS);
  const driverHash   = await bcrypt.hash('Driver@123',   SALT_ROUNDS);
  const customerHash = await bcrypt.hash('Customer@123', SALT_ROUNDS);
  const genericHash  = await bcrypt.hash('Password@123', SALT_ROUNDS);

  // ── 3. Demo accounts ──
  console.log('👤 Creating demo accounts...');

  const adminUser = await prisma.user.create({
    data: {
      id:           uuid(),
      email:        'admin@dts.dev',
      passwordHash: adminHash,
      name:         'Admin User',
      phone:        '+91-9000000001',
      role:         'ADMIN',
    },
  });
  // Admin user reference kept for future notification seeding
  void adminUser;

  const demoDriverUser = await prisma.user.create({
    data: {
      id:           uuid(),
      email:        'driver@dts.dev',
      passwordHash: driverHash,
      name:         'Raju Delivery',
      phone:        '+91-9000000002',
      role:         'DRIVER',
    },
  });

  const demoDriver = await prisma.driver.create({
    data: {
      id:              uuid(),
      userId:          demoDriverUser.id,
      vehicleType:     'BIKE',
      vehicleNumber:   'MH-01-DTS-0001',
      rating:          4.8,
      totalDeliveries: 142,
      totalEarnings:   38500,
      status:          'AVAILABLE',
      currentLat:      19.1197,
      currentLng:      72.8464,
      lastSeenAt:      new Date(),
    },
  });

  const demoCustomerUser = await prisma.user.create({
    data: {
      id:           uuid(),
      email:        'customer@dts.dev',
      passwordHash: customerHash,
      name:         'Priya Demo',
      phone:        '+91-9000000003',
      role:         'CUSTOMER',
    },
  });

  const demoCustomer = await prisma.customer.create({
    data: {
      id:             uuid(),
      userId:         demoCustomerUser.id,
      defaultAddress: '14, Versova Road, Andheri West, Mumbai - 400058',
    },
  });

  console.log('   ✅ admin@dts.dev, driver@dts.dev, customer@dts.dev\n');

  // ── 4. 20 customers ──
  console.log('👥 Creating 20 customers...');
  const customers: Array<{ id: string; userId: string }> = [
    { id: demoCustomer.id, userId: demoCustomerUser.id },
  ];

  for (let i = 0; i < 19; i++) {
    const name  = ALL_NAMES[i % ALL_NAMES.length] + ` C${i + 2}`;
    const slug  = `customer${i + 2}`;
    const phone = `+91-${randomInt(7000000000, 9999999999)}`;

    const user = await prisma.user.create({
      data: {
        id:           uuid(),
        email:        `${slug}@example.com`,
        passwordHash: genericHash,
        name,
        phone,
        role:         'CUSTOMER',
      },
    });

    const addr = pick(ADDRESSES);
    const cust = await prisma.customer.create({
      data: {
        id:             uuid(),
        userId:         user.id,
        defaultAddress: `${addr.street}, ${addr.city} - ${randomInt(400001, 600090)}`,
      },
    });
    customers.push({ id: cust.id, userId: user.id });
  }
  console.log(`   ✅ ${customers.length} customers created.\n`);

  // ── 5. 15 drivers ──
  console.log('🚴 Creating 15 drivers...');
  const drivers: Array<{ id: string; userId: string }> = [
    { id: demoDriver.id, userId: demoDriverUser.id },
  ];
  const driverStatuses = ['AVAILABLE', 'BUSY', 'ONLINE', 'OFFLINE'];

  for (let i = 0; i < 14; i++) {
    const name    = INDIAN_MALE_NAMES[i % INDIAN_MALE_NAMES.length] + ` D${i + 2}`;
    const slug    = `driver${i + 2}`;
    const phone   = `+91-${randomInt(7000000000, 9999999999)}`;
    const vehicle = DRIVER_VEHICLES[(i + 1) % DRIVER_VEHICLES.length];
    const locAddr = pick(ADDRESSES);

    const user = await prisma.user.create({
      data: {
        id:           uuid(),
        email:        `${slug}@driver.dts.dev`,
        passwordHash: genericHash,
        name,
        phone,
        role:         'DRIVER',
      },
    });

    const driver = await prisma.driver.create({
      data: {
        id:              uuid(),
        userId:          user.id,
        vehicleType:     vehicle.type,
        vehicleNumber:   vehicle.number,
        rating:          randomFloat(3.5, 5.0),
        totalDeliveries: randomInt(10, 500),
        totalEarnings:   randomFloat(5000, 200000),
        status:          pick(driverStatuses),
        currentLat:      locAddr.lat + (Math.random() - 0.5) * 0.05,
        currentLng:      locAddr.lng + (Math.random() - 0.5) * 0.05,
        lastSeenAt:      new Date(Date.now() - randomInt(0, 3600) * 1000),
      },
    });

    drivers.push({ id: driver.id, userId: user.id });
  }
  console.log(`   ✅ ${drivers.length} drivers created.\n`);

  // ── 6. 50 deliveries ──
  console.log('📦 Creating 50 deliveries...');
  let deliveryCount = 0;

  const allStatusesOrdered = [
    'ORDER_CREATED',
    'DRIVER_ASSIGNED',
    'DRIVER_ACCEPTED',
    'DRIVER_PICKED_UP',
    'IN_TRANSIT',
    'NEAR_DESTINATION',
    'DELIVERED',
  ];

  for (const bucket of STATUS_BUCKETS) {
    for (let i = 0; i < bucket.count; i++) {
      const customer      = pick(customers);
      const pickupAddr    = pick(ADDRESSES);
      let   destAddr      = pick(ADDRESSES);
      while (destAddr.label === pickupAddr.label) {
        destAddr = pick(ADDRESSES);
      }

      const pickup = await prisma.address.create({
        data: {
          id:     uuid(),
          label:  pickupAddr.label,
          street: pickupAddr.street,
          city:   pickupAddr.city,
          state:  pickupAddr.state,
          lat:    pickupAddr.lat + (Math.random() - 0.5) * 0.005,
          lng:    pickupAddr.lng + (Math.random() - 0.5) * 0.005,
        },
      });

      const destination = await prisma.address.create({
        data: {
          id:     uuid(),
          label:  destAddr.label,
          street: destAddr.street,
          city:   destAddr.city,
          state:  destAddr.state,
          lat:    destAddr.lat + (Math.random() - 0.5) * 0.005,
          lng:    destAddr.lng + (Math.random() - 0.5) * 0.005,
        },
      });

      const driver         = bucket.needsDriver ? pick(drivers) : null;
      const amount         = randomFloat(80, 500);
      const createdMinsAgo = randomInt(30, 10080); // up to 7 days ago

      const noteOptions = [
        'Please handle with care',
        'Ring the doorbell twice',
        'Leave at door if not home',
        'Call before delivery',
        'Fragile items inside',
        'Contact security at gate',
      ];

      const delivery = await prisma.delivery.create({
        data: {
          id:                   uuid(),
          trackingNumber:       trackingNumber(),
          customerId:           customer.id,
          driverId:             driver?.id,
          pickupAddressId:      pickup.id,
          destinationAddressId: destination.id,
          status:               bucket.status,
          totalAmount:          amount,
          notes:                Math.random() > 0.6 ? pick(noteOptions) : null,
          estimatedArrival:
            bucket.status !== 'DELIVERED' && bucket.status !== 'CANCELLED'
              ? new Date(Date.now() + randomInt(10, 120) * 60 * 1000)
              : null,
          createdAt: new Date(Date.now() - createdMinsAgo * 60 * 1000),
        },
      });

      // ── Status history ──
      const historyStatuses =
        bucket.status === 'CANCELLED'
          ? ['ORDER_CREATED', 'CANCELLED']
          : (() => {
              const idx = allStatusesOrdered.indexOf(bucket.status);
              return idx >= 0 ? allStatusesOrdered.slice(0, idx + 1) : [bucket.status];
            })();

      let historyOffset = createdMinsAgo;
      for (const hs of historyStatuses) {
        historyOffset -= randomInt(5, 30);
        const note =
          hs === 'DRIVER_ASSIGNED'  ? 'Driver assigned by system' :
          hs === 'DRIVER_PICKED_UP' ? 'Package collected from sender' :
          hs === 'DELIVERED'        ? 'Delivered and confirmed by recipient' :
          hs === 'CANCELLED'        ? 'Cancelled by customer' :
          null;

        await prisma.deliveryStatusHistory.create({
          data: {
            id:         uuid(),
            deliveryId: delivery.id,
            status:     hs,
            timestamp:  new Date(Date.now() - Math.max(historyOffset, 1) * 60 * 1000),
            note,
          },
        });
      }

      // ── Location history for IN_TRANSIT / NEAR_DESTINATION ──
      if (bucket.needsLocation && driver) {
        const locCount  = randomInt(20, 50);
        const minsAgo   = bucket.status === 'NEAR_DESTINATION' ? randomInt(5, 15) : randomInt(15, 60);

        const fromLat = bucket.status === 'NEAR_DESTINATION'
          ? destination.lat - (Math.random() * 0.005 + 0.001)
          : pickup.lat;
        const fromLng = bucket.status === 'NEAR_DESTINATION'
          ? destination.lng - (Math.random() * 0.005 + 0.001)
          : pickup.lng;

        const locationPoints = generateLocationHistory(
          fromLat, fromLng,
          destination.lat, destination.lng,
          locCount, minsAgo,
        );

        for (const point of locationPoints) {
          await prisma.locationUpdate.create({
            data: {
              id:         uuid(),
              driverId:   driver.id,
              deliveryId: delivery.id,
              lat:        point.lat,
              lng:        point.lng,
              heading:    point.heading,
              speed:      point.speed,
              accuracy:   point.accuracy,
              timestamp:  point.timestamp,
            },
          });
        }

        // Update driver's current position to the last GPS point
        const lastPoint = locationPoints[locationPoints.length - 1];
        await prisma.driver.update({
          where: { id: driver.id },
          data: {
            currentLat: lastPoint.lat,
            currentLng: lastPoint.lng,
            lastSeenAt: lastPoint.timestamp,
            status:     'BUSY',
          },
        });
      }

      deliveryCount++;
    }
  }

  // ── 7. Additional: 2 DELAYED deliveries ──
  console.log('⏰ Creating 2 DELAYED deliveries...');
  for (let i = 0; i < 2; i++) {
    const customer   = pick(customers);
    const driver     = pick(drivers);
    const pickupAddr = pick(ADDRESSES);
    let   destAddr   = pick(ADDRESSES);
    while (destAddr.label === pickupAddr.label) destAddr = pick(ADDRESSES);

    const pickup = await prisma.address.create({
      data: {
        id:     uuid(),
        label:  pickupAddr.label,
        street: pickupAddr.street,
        city:   pickupAddr.city,
        state:  pickupAddr.state,
        lat:    pickupAddr.lat + (Math.random() - 0.5) * 0.005,
        lng:    pickupAddr.lng + (Math.random() - 0.5) * 0.005,
      },
    });

    const destination = await prisma.address.create({
      data: {
        id:     uuid(),
        label:  destAddr.label,
        street: destAddr.street,
        city:   destAddr.city,
        state:  destAddr.state,
        lat:    destAddr.lat + (Math.random() - 0.5) * 0.005,
        lng:    destAddr.lng + (Math.random() - 0.5) * 0.005,
      },
    });

    const delivery = await prisma.delivery.create({
      data: {
        id:                   uuid(),
        trackingNumber:       trackingNumber(),
        customerId:           customer.id,
        driverId:             driver.id,
        pickupAddressId:      pickup.id,
        destinationAddressId: destination.id,
        status:               'DELAYED',
        totalAmount:          randomFloat(150, 450),
        notes:                'Delayed due to heavy traffic on route',
        estimatedArrival:     new Date(Date.now() + randomInt(30, 90) * 60 * 1000),
        createdAt:            new Date(Date.now() - randomInt(120, 480) * 60 * 1000),
      },
    });

    const delayedHistory = [
      { s: 'ORDER_CREATED',    note: null },
      { s: 'DRIVER_ASSIGNED',  note: 'Driver assigned by system' },
      { s: 'DRIVER_ACCEPTED',  note: null },
      { s: 'DRIVER_PICKED_UP', note: 'Package collected from sender' },
      { s: 'IN_TRANSIT',       note: null },
      { s: 'DELAYED',          note: 'Heavy traffic on route' },
    ];

    let offset = randomInt(120, 480);
    for (const { s, note } of delayedHistory) {
      offset -= randomInt(10, 30);
      await prisma.deliveryStatusHistory.create({
        data: {
          id:         uuid(),
          deliveryId: delivery.id,
          status:     s,
          timestamp:  new Date(Date.now() - Math.max(offset, 1) * 60 * 1000),
          note,
        },
      });
    }

    deliveryCount++;
  }
  console.log(`   ✅ DELAYED deliveries added.\n`);

  // ── 8. Notifications for demo customer ──
  console.log('🔔 Creating sample notifications...');
  const notifDefs = [
    { type: 'DELIVERY_ASSIGNED',  title: 'Driver Assigned!',       body: 'Raju Delivery has been assigned to your order.' },
    { type: 'DELIVERY_PICKED_UP', title: 'Package Picked Up',      body: 'Your package has been picked up and is on the way.' },
    { type: 'DELIVERY_NEAR',      title: 'Almost There!',          body: 'Your delivery is just 2 minutes away.' },
    { type: 'DELIVERY_COMPLETED', title: 'Delivered Successfully', body: 'Your order has been delivered. Thank you!' },
    { type: 'NEW_ORDER',          title: 'New Order Received',     body: 'Order has been placed successfully.' },
  ];

  for (const notif of notifDefs) {
    await prisma.notification.create({
      data: {
        id:        uuid(),
        userId:    demoCustomerUser.id,
        type:      notif.type,
        title:     notif.title,
        body:      notif.body,
        isRead:    Math.random() > 0.5,
        createdAt: new Date(Date.now() - randomInt(5, 1440) * 60 * 1000),
      },
    });
  }
  console.log('   ✅ Notifications created.\n');

  // ── 9. Print summary ──
  const totalUsers         = await prisma.user.count();
  const totalDrivers       = await prisma.driver.count();
  const totalCustomers     = await prisma.customer.count();
  const totalDeliveries    = await prisma.delivery.count();
  const totalLocations     = await prisma.locationUpdate.count();
  const totalStatusHistory = await prisma.deliveryStatusHistory.count();
  const totalNotifications = await prisma.notification.count();

  console.log('═══════════════════════════════════════════════════════');
  console.log('✅ Seed complete! Summary:');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
  console.log('  Demo Accounts:');
  console.log('  ┌─────────────────────────────────────────────────┐');
  console.log('  │  Email               Password      Role         │');
  console.log('  ├─────────────────────────────────────────────────┤');
  console.log('  │  admin@dts.dev       Admin@123     ADMIN        │');
  console.log('  │  driver@dts.dev      Driver@123    DRIVER       │');
  console.log('  │  customer@dts.dev    Customer@123  CUSTOMER     │');
  console.log('  └─────────────────────────────────────────────────┘');
  console.log('');
  console.log(`  Total Users:          ${totalUsers}`);
  console.log(`  Total Drivers:        ${totalDrivers}`);
  console.log(`  Total Customers:      ${totalCustomers}`);
  console.log(`  Total Deliveries:     ${totalDeliveries}`);
  console.log(`  Location Updates:     ${totalLocations}`);
  console.log(`  Status History Rows:  ${totalStatusHistory}`);
  console.log(`  Notifications:        ${totalNotifications}`);
  console.log('');
  console.log('  Delivery Status Mix:');
  for (const bucket of STATUS_BUCKETS) {
    console.log(`  • ${bucket.status.padEnd(20)} ${bucket.count}`);
  }
  console.log(`  • ${'DELAYED'.padEnd(20)} 2`);
  console.log('═══════════════════════════════════════════════════════');
}

seed()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
