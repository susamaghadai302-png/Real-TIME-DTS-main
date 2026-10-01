#!/bin/bash
set -e
API_URL="http://localhost:4000/api"

echo "Logging in as Customer..."
CTOKEN=$(curl -s -X POST $API_URL/auth/login -H "Content-Type: application/json" -d '{"email":"customer@dts.dev","password":"Customer@123"}' | grep -o '"token":"[^"]*' | cut -d'"' -f4)

echo "Logging in as Driver..."
DTOKEN=$(curl -s -X POST $API_URL/auth/login -H "Content-Type: application/json" -d '{"email":"driver@dts.dev","password":"Driver@123"}' | grep -o '"token":"[^"]*' | cut -d'"' -f4)

echo "Logging in as Admin..."
ATOKEN=$(curl -s -X POST $API_URL/auth/login -H "Content-Type: application/json" -d '{"email":"admin@dts.dev","password":"Admin@123"}' | grep -o '"token":"[^"]*' | cut -d'"' -f4)
DRIVER_ID=$(curl -s -X GET $API_URL/drivers -H "Authorization: Bearer $ATOKEN" | grep -o '"id":"[^"]*' | head -n1 | cut -d'"' -f4)

echo "Customer creating delivery..."
DELIVERY_ID=$(curl -s -X POST $API_URL/deliveries \
  -H "Authorization: Bearer $CTOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pickupAddress": {"street": "St1", "city": "C1", "state": "S1", "lat": 10, "lng": 10},
    "destinationAddress": {"street": "St2", "city": "C2", "state": "S2", "lat": 20, "lng": 20},
    "notes": "Testing",
    "totalAmount": 100
  }' | grep -o '"id":"[^"]*' | head -n1 | cut -d'"' -f4)

echo "Admin assigning driver..."
curl -s -X POST $API_URL/deliveries/$DELIVERY_ID/assign-driver \
  -H "Authorization: Bearer $ATOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"driverId\":\"$DRIVER_ID\"}" > /dev/null

echo "Driver updating status..."
curl -s -X PATCH $API_URL/deliveries/$DELIVERY_ID/status \
  -H "Authorization: Bearer $DTOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"DRIVER_ACCEPTED"}' > /dev/null

echo "Customer updating status (should fail)..."
CFAIL=$(curl -s -X PATCH $API_URL/deliveries/$DELIVERY_ID/status \
  -H "Authorization: Bearer $CTOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"IN_TRANSIT"}')

if echo $CFAIL | grep -q "Customers cannot update status"; then
  echo "✅ Customer rejected from updating status."
else
  echo "❌ Customer updated status unexpectedly."
fi

echo "API Test Complete."
