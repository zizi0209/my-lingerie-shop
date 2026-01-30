#!/usr/bin/env bash

echo "🚀 Waiting for Railway deployment..."
echo ""

# Wait for deployment (3 minutes)
sleep 180

echo "🧪 Testing Railway API..."
curl -s https://my-lingerie-shop-production-6286.up.railway.app/api/health || echo "❌ API not ready yet"
echo ""
echo ""

echo "🌱 Seeding Railway Production Database..."
echo ""

# The seed will run using Railway's DATABASE_URL from .env
# We just need to run it locally - it connects to Railway DB
node run-seed.js

echo ""
echo "✅ Done! Check Railway Dashboard for seed logs"
