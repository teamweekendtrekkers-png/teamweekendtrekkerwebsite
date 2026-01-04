#!/bin/bash

# ============================================
# Test Script for Trip Detail Page Sections
# ============================================
# Tests: Pickup Points, Cancellation Policy, Guidelines, FAQs
# Created: January 4, 2026
# ============================================

echo "================================================"
echo "🧪 TESTING TRIP DETAIL PAGE SECTIONS"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS_COUNT=0
FAIL_COUNT=0

# Function to check if string exists in file
check_exists() {
    local file=$1
    local search=$2
    local desc=$3
    
    if grep -q "$search" "$file" 2>/dev/null; then
        echo -e "  ${GREEN}✅${NC} $desc"
        ((PASS_COUNT++))
    else
        echo -e "  ${RED}❌${NC} $desc"
        ((FAIL_COUNT++))
    fi
}

# Function to check JavaScript variable exists
check_js_var() {
    local file=$1
    local varname=$2
    local desc=$3
    
    if grep -q "const $varname\|var $varname\|let $varname" "$file" 2>/dev/null; then
        echo -e "  ${GREEN}✅${NC} $desc"
        ((PASS_COUNT++))
    else
        echo -e "  ${RED}❌${NC} $desc"
        ((FAIL_COUNT++))
    fi
}

# Function to count array items
count_array_items() {
    local file=$1
    local varname=$2
    local expected=$3
    local desc=$4
    
    # Extract the array and count items (rough count based on opening braces)
    local count=$(grep -A 200 "const $varname" "$file" | grep -c "{" | head -1)
    
    if [ "$count" -ge "$expected" ]; then
        echo -e "  ${GREEN}✅${NC} $desc (found $count items)"
        ((PASS_COUNT++))
    else
        echo -e "  ${RED}❌${NC} $desc (expected $expected, found $count)"
        ((FAIL_COUNT++))
    fi
}

echo "[1/5] Checking trips-data.js for common data variables..."
echo ""

# Check commonPickupPoints
check_js_var "js/trips-data.js" "commonPickupPoints" "commonPickupPoints variable exists"

# Check pickup points content
check_exists "js/trips-data.js" "Majestic" "Majestic pickup point"
check_exists "js/trips-data.js" "Koramangala" "Koramangala pickup point"
check_exists "js/trips-data.js" "Silk Board" "Silk Board pickup point"
check_exists "js/trips-data.js" "Electronic City" "Electronic City pickup point"

echo ""
echo "[2/5] Checking Cancellation Policy..."
echo ""

check_js_var "js/trips-data.js" "commonCancellationPolicy" "commonCancellationPolicy variable exists"
check_exists "js/trips-data.js" "7+ days" "7+ days policy"
check_exists "js/trips-data.js" "3-6 days" "3-6 days policy"
check_exists "js/trips-data.js" "0-2 days" "0-2 days policy"
check_exists "js/trips-data.js" '50%' "50% cancellation fee"
check_exists "js/trips-data.js" '70%' "70% cancellation fee"
check_exists "js/trips-data.js" '100%' "100% cancellation fee"

echo ""
echo "[3/5] Checking Trip Guidelines (PTU Style)..."
echo ""

check_js_var "js/trips-data.js" "commonGuidelines" "commonGuidelines variable exists"
check_exists "js/trips-data.js" "No Alcohol" "No Alcohol guideline"
check_exists "js/trips-data.js" "Dinner Before Boarding" "Dinner Before Boarding guideline"
check_exists "js/trips-data.js" "Travel Arrangements" "Travel Arrangements guideline"
check_exists "js/trips-data.js" "Embrace the Outdoors" "Embrace Outdoors guideline"
check_exists "js/trips-data.js" "Vegetarian" "Vegetarian food guideline"
check_exists "js/trips-data.js" "Leave No Trace" "Leave No Trace guideline"
check_exists "js/trips-data.js" "Personal Belongings" "Personal Belongings guideline"
check_exists "js/trips-data.js" "Potential Delays" "Potential Delays guideline"

echo ""
echo "[4/5] Checking FAQs (PTU Style)..."
echo ""

check_js_var "js/trips-data.js" "commonFAQs" "commonFAQs variable exists"
check_exists "js/trips-data.js" "How do I book" "Booking FAQ"
check_exists "js/trips-data.js" "WhatsApp group" "WhatsApp group FAQ"
check_exists "js/trips-data.js" "solo travelers" "Solo travelers FAQ"
check_exists "js/trips-data.js" "women travelers" "Women safety FAQ"
check_exists "js/trips-data.js" "discounts" "Discounts FAQ"
check_exists "js/trips-data.js" "luggage" "Luggage FAQ"
check_exists "js/trips-data.js" "fit" "Fitness FAQ"
check_exists "js/trips-data.js" "cancel" "Cancellation FAQ"
check_exists "js/trips-data.js" "weather" "Weather cancellation FAQ"

echo ""
echo "[5/5] Checking trip-detail.html uses the common data..."
echo ""

check_exists "trip-detail.html" "commonPickupPoints" "HTML references commonPickupPoints"
check_exists "trip-detail.html" "commonCancellationPolicy" "HTML references commonCancellationPolicy"
check_exists "trip-detail.html" "commonGuidelines" "HTML references commonGuidelines"
check_exists "trip-detail.html" "commonFAQs" "HTML references commonFAQs"
check_exists "trip-detail.html" "pickupTable" "pickupTable element exists"
check_exists "trip-detail.html" "policyCards" "policyCards element exists"
check_exists "trip-detail.html" "guidelinesGrid" "guidelinesGrid element exists"
check_exists "trip-detail.html" "faqAccordion" "faqAccordion element exists"

echo ""
echo "================================================"
echo "📊 TEST SUMMARY"
echo "================================================"
echo ""
echo -e "  ${GREEN}Passed:${NC} $PASS_COUNT"
echo -e "  ${RED}Failed:${NC} $FAIL_COUNT"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "  ${GREEN}✅ ALL TESTS PASSED!${NC}"
    echo "  Trip detail sections should now display correctly."
    exit 0
else
    echo -e "  ${RED}❌ SOME TESTS FAILED!${NC}"
    echo "  Please check the issues above."
    exit 1
fi
