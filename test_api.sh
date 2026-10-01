#!/bin/bash
set -e

# API Base URL
API_URL="http://localhost:4000/api"

echo "1. Testing Auth - Login as Admin..."
LOGIN_RES=$(curl -s -X POST $API_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@dts.dev","password":"Admin@123"}')

TOKEN=$(echo $LOGIN_RES | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Login Failed"
  exit 1
fi
echo "✅ Login Successful. Token received."

echo "2. Testing Auth - Invalid Login..."
FAIL_RES=$(curl -s -X POST $API_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@dts.dev","password":"wrongpassword"}')
if echo $FAIL_RES | grep -q "Invalid credentials"; then
  echo "✅ Invalid Login correctly rejected."
else
  echo "❌ Invalid Login handled incorrectly."
  exit 1
fi

echo "3. Fetching Deliveries..."
DELIVERIES=$(curl -s -X GET $API_URL/deliveries \
  -H "Authorization: Bearer $TOKEN")
if echo $DELIVERIES | grep -q '"items"'; then
  echo "✅ Deliveries fetched."
else
  echo "❌ Failed to fetch deliveries."
  exit 1
fi

echo "4. Creating a Delivery..."
CREATE_RES=$(curl -s -X POST $API_URL/deliveries \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pickupAddress": {"street": "Test", "city": "Test", "state": "Test", "lat": 10, "lng": 10},
    "destinationAddress": {"street": "Test2", "city": "Test2", "state": "Test2", "lat": 20, "lng": 20},
    "notes": "Testing",
    "totalAmount": 100
  }')
if echo $CREATE_RES | grep -q '"trackingNumber"'; then
  DELIVERY_ID=$(echo $CREATE_RES | grep -o '"id":"[^"]*' | cut -d'"' -f4)
  echo "✅ Delivery created. ID: $DELIVERY_ID"
else
  echo "❌ Failed to create delivery."
  exit 1
fi

echo "5. Updating Delivery Status..."
UPDATE_RES=$(curl -s -X PUT $API_URL/deliveries/$DELIVERY_ID/status \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"DRIVER_ASSIGNED"}')
if echo $UPDATE_RES | grep -q '"status":"DRIVER_ASSIGNED"'; then
  echo "✅ Delivery status updated."
else
  echo "❌ Failed to update delivery status."
  exit 1
fi

echo "All API Tests Passed."
