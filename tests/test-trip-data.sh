#!/bin/bash
# ============================================
# TRIP DATA INTEGRITY TESTS
# ============================================
# Validates all trip data entries have required fields
# ============================================

cd "$(dirname "$0")/.." || exit 1

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASSED=0
FAILED=0

pass() { echo -e "  ${GREEN}✓${NC} $1"; PASSED=$((PASSED + 1)); }
fail() { echo -e "  ${RED}✗${NC} $1"; FAILED=$((FAILED + 1)); }

echo ""
echo "=============================================="
echo "🔍 TRIP DATA INTEGRITY TESTS"
echo "=============================================="
echo ""

TRIPS_FILE="js/trips-data.js"

# Extract all trip IDs
TRIP_IDS=$(grep -oP '^\s{4}[a-z0-9-]+(?=:)' "$TRIPS_FILE" | sed 's/^ *//' | head -50)

echo "Testing individual trip entries..."
echo ""

for trip_id in $TRIP_IDS; do
    # Skip if it's a function or common data
    if [[ "$trip_id" == "function" ]] || [[ "$trip_id" == "const" ]]; then
        continue
    fi
    
    echo -e "${YELLOW}Testing: $trip_id${NC}"
    
    # Extract trip block (approximately)
    TRIP_BLOCK=$(sed -n "/^    $trip_id:/,/^    [a-z]/p" "$TRIPS_FILE" | head -60)
    
    # Check required fields
    REQUIRED_FIELDS=("title" "location" "price" "image" "duration" "difficulty" "isActive")
    
    for field in "${REQUIRED_FIELDS[@]}"; do
        if echo "$TRIP_BLOCK" | grep -q "$field:"; then
            pass "$field field exists"
        else
            fail "$field field missing"
        fi
    done
    
    # Check price format (should start with ₹)
    PRICE=$(echo "$TRIP_BLOCK" | grep -oP 'price: "[^"]*"' | head -1)
    if echo "$PRICE" | grep -q "₹"; then
        pass "Price has ₹ symbol"
    else
        fail "Price missing ₹ symbol: $PRICE"
    fi
    
    # Check image path
    IMAGE=$(echo "$TRIP_BLOCK" | grep -oP 'image: "[^"]*"' | head -1 | sed 's/image: "//;s/"//')
    if [[ -f "$IMAGE" ]]; then
        pass "Image file exists: $IMAGE"
    else
        fail "Image file missing: $IMAGE"
    fi
    
    # Check availableDates
    if echo "$TRIP_BLOCK" | grep -q "availableDates:"; then
        pass "availableDates defined"
    else
        fail "availableDates missing"
    fi
    
    # Check itinerary
    if echo "$TRIP_BLOCK" | grep -q "itinerary:"; then
        pass "itinerary defined"
    else
        fail "itinerary missing"
    fi
    
    # Check includes
    if echo "$TRIP_BLOCK" | grep -q "includes:"; then
        pass "includes defined"
    else
        fail "includes missing"
    fi
    
    # Check excludes
    if echo "$TRIP_BLOCK" | grep -q "excludes:"; then
        pass "excludes defined"
    else
        fail "excludes missing"
    fi
    
    echo ""
done

echo "=============================================="
echo "📊 TRIP DATA TEST SUMMARY"
echo "=============================================="
echo -e "${GREEN}Passed:${NC} $PASSED"
echo -e "${RED}Failed:${NC} $FAILED"
echo ""

if [[ "$FAILED" -gt 0 ]]; then
    echo -e "${RED}❌ TRIP DATA TESTS FAILED${NC}"
    exit 1
else
    echo -e "${GREEN}✅ ALL TRIP DATA TESTS PASSED${NC}"
    exit 0
fi
