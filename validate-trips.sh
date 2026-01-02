#!/bin/bash
# ============================================
# TRIPS DATA VALIDATOR
# ============================================
# Run this script to check if trips-data.js is valid
# Usage: ./validate-trips.sh

TRIPS_FILE="js/trips-data.js"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🔍 Validating $TRIPS_FILE..."
echo ""

ERRORS=0

# Check 1: File exists
if [ ! -f "$TRIPS_FILE" ]; then
    echo "❌ ERROR: $TRIPS_FILE not found!"
    exit 1
fi

# Check 2: getTripData function exists
if ! grep -q "function getTripData" "$TRIPS_FILE"; then
    echo "❌ ERROR: getTripData function is MISSING!"
    echo "   This will cause ALL trip pages to show Netravati info!"
    ERRORS=$((ERRORS + 1))
else
    echo "✅ getTripData function: Found"
fi

# Check 3: JavaScript syntax
if command -v node &> /dev/null; then
    if node -c "$TRIPS_FILE" 2>/dev/null; then
        echo "✅ JavaScript syntax: Valid"
    else
        echo "❌ ERROR: JavaScript syntax error!"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo "⚠️  Node.js not found, skipping syntax check"
fi

# Check 4: Trip count
TRIP_COUNT=$(grep -E '^\s+\"?[a-z\"-]+\"?: \{$' "$TRIPS_FILE" | wc -l)
if [ "$TRIP_COUNT" -ge 26 ]; then
    echo "✅ Trip count: $TRIP_COUNT trips"
elif [ "$TRIP_COUNT" -ge 20 ]; then
    echo "⚠️  Trip count: $TRIP_COUNT trips (expected 26)"
else
    echo "❌ ERROR: Only $TRIP_COUNT trips found (expected 26)!"
    echo "   The file may be truncated."
    ERRORS=$((ERRORS + 1))
fi

# Check 5: File line count
LINE_COUNT=$(wc -l < "$TRIPS_FILE")
if [ "$LINE_COUNT" -ge 600 ]; then
    echo "✅ File size: $LINE_COUNT lines"
else
    echo "⚠️  File size: $LINE_COUNT lines (expected 620+)"
fi

# Check 6: CloudFront URLs (should be 0 for offline mode)
CLOUDFRONT_COUNT=$(grep -c "cloudfront" "$TRIPS_FILE" || echo "0")
if [ "$CLOUDFRONT_COUNT" -eq 0 ]; then
    echo "✅ Offline images: All local"
else
    echo "⚠️  CloudFront URLs: $CLOUDFRONT_COUNT found (should use local images)"
fi

echo ""
if [ $ERRORS -eq 0 ]; then
    echo "✅ All checks passed! Website should work correctly."
    exit 0
else
    echo "❌ $ERRORS error(s) found! Please fix before deploying."
    echo ""
    echo "To fix missing getTripData function, add this at the end of $TRIPS_FILE:"
    echo ""
    echo "function getTripData(tripId) {"
    echo "    return tripsData[tripId] || tripsData['netravati'];"
    echo "}"
    exit 1
fi
