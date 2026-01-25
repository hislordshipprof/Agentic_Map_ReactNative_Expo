#!/bin/bash

# Test script for ElevenLabs OpenAI-compatible endpoint
# Run: bash scripts/test-elevenlabs-endpoint.sh

BASE_URL="${1:-http://localhost:3000}"

echo "Testing ElevenLabs endpoint at: $BASE_URL"
echo "================================================"

# Test 1: Non-streaming request
echo ""
echo "Test 1: Non-streaming chat completion"
echo "--------------------------------------"

curl -X POST "$BASE_URL/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "orchestrator-v1",
    "messages": [
      {"role": "system", "content": "You are a navigation assistant."},
      {"role": "user", "content": "Take me home"}
    ],
    "stream": false,
    "elevenlabs_extra_body": {
      "session_id": "test-session-001",
      "user_location": {"lat": 39.7392, "lng": -104.9903}
    }
  }' 2>/dev/null | jq .

echo ""
echo "================================================"

# Test 2: Streaming request
echo ""
echo "Test 2: Streaming chat completion (SSE)"
echo "--------------------------------------"

curl -X POST "$BASE_URL/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{
    "model": "orchestrator-v1",
    "messages": [
      {"role": "user", "content": "Find me a Starbucks nearby"}
    ],
    "stream": true,
    "elevenlabs_extra_body": {
      "session_id": "test-session-002",
      "user_location": {"lat": 39.7392, "lng": -104.9903}
    }
  }' 2>/dev/null

echo ""
echo "================================================"

# Test 3: Models endpoint
echo ""
echo "Test 3: List models"
echo "--------------------------------------"

curl -X POST "$BASE_URL/v1/models" \
  -H "Content-Type: application/json" 2>/dev/null | jq .

echo ""
echo "Done!"
