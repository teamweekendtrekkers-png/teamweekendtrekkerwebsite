#!/bin/bash
# ============================================
# TEAM WEEKEND TREKKERS - COMPREHENSIVE WEBSITE TESTS
# ============================================
# Run: ./tests/test-website.sh
# Exit codes: 0 = all passed, 1 = failures
# ============================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Helper functions
pass() {
    echo -e "  ${GREEN}✓${NC} $1"
    PASSED=$((PASSED + 1))
}

fail() {
    echo -e "  ${RED}✗${NC} $1"
    FAILED=$((FAILED + 1))
}

warn() {
    echo -e "  ${YELLOW}⚠${NC} $1"
    WARNINGS=$((WARNINGS + 1))
}

info() {
    echo -e "  ${BLUE}ℹ${NC} $1"
}

section() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}[$1]${NC} $2"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Change to project root
cd "$(dirname "$0")/.." || exit 1
PROJECT_ROOT=$(pwd)

echo ""
echo "=============================================="
echo "🧪 WEBSITE TEST SUITE - Team Weekend Trekkers"
echo "=============================================="
echo "Project: $PROJECT_ROOT"
echo "Date: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# ============================================
# TEST 1: Required Files Exist
# ============================================
section "1/12" "Required Files Check"

REQUIRED_FILES=(
    "index.html"
    "trips.html"
    "trip-detail.html"
    "checkout.html"
    "about.html"
    "contact.html"
    "js/trips-data.js"
    "js/main.js"
    "js/featured-trips.js"
    "js/security.js"
    "css/style.css"
    "css/pages.css"
    "css/responsive.css"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [[ -f "$file" ]]; then
        pass "$file exists"
    else
        fail "$file missing"
    fi
done

# ============================================
# TEST 2: HTML Syntax Validation
# ============================================
section "2/12" "HTML Structure Validation"

HTML_FILES=(index.html trips.html trip-detail.html checkout.html about.html contact.html)

for file in "${HTML_FILES[@]}"; do
    if [[ -f "$file" ]]; then
        # Check for basic HTML structure
        if grep -q "<!DOCTYPE html>" "$file" && grep -q "</html>" "$file"; then
            pass "$file has valid HTML structure"
        else
            fail "$file missing DOCTYPE or closing html tag"
        fi
        
        # Check for head and body tags
        if grep -q "<head>" "$file" && grep -q "</head>" "$file" && grep -q "<body" "$file" && grep -q "</body>" "$file"; then
            pass "$file has head and body tags"
        else
            fail "$file missing head or body tags"
        fi
        
        # Check for meta viewport (mobile responsive)
        if grep -q 'name="viewport"' "$file"; then
            pass "$file has viewport meta tag"
        else
            warn "$file missing viewport meta tag"
        fi
    fi
done

# ============================================
# TEST 3: JavaScript Syntax Validation
# ============================================
section "3/12" "JavaScript Syntax Validation"

JS_FILES=(js/trips-data.js js/main.js js/featured-trips.js js/security.js js/razorpay.js)

for file in "${JS_FILES[@]}"; do
    if [[ -f "$file" ]]; then
        if node -c "$file" 2>/dev/null; then
            pass "$file syntax valid"
        else
            fail "$file has syntax errors"
        fi
    fi
done

# ============================================
# TEST 4: CSS Syntax Validation
# ============================================
section "4/12" "CSS Validation"

CSS_FILES=(css/style.css css/pages.css css/responsive.css)

for file in "${CSS_FILES[@]}"; do
    if [[ -f "$file" ]]; then
        # Check for balanced braces
        OPEN_BRACES=$(grep -o '{' "$file" | wc -l)
        CLOSE_BRACES=$(grep -o '}' "$file" | wc -l)
        
        if [[ "$OPEN_BRACES" -eq "$CLOSE_BRACES" ]]; then
            pass "$file has balanced braces ($OPEN_BRACES pairs)"
        else
            fail "$file has unbalanced braces (open: $OPEN_BRACES, close: $CLOSE_BRACES)"
        fi
        
        # Check file is not empty
        if [[ -s "$file" ]]; then
            pass "$file is not empty"
        else
            fail "$file is empty"
        fi
    fi
done

# ============================================
# TEST 5: trips-data.js Structure
# ============================================
section "5/12" "Trip Data Structure Validation"

TRIPS_FILE="js/trips-data.js"

if [[ -f "$TRIPS_FILE" ]]; then
    # Check for tripsData object
    if grep -q "const tripsData" "$TRIPS_FILE"; then
        pass "tripsData object defined"
    else
        fail "tripsData object not found"
    fi
    
    # Check for getTripData function
    if grep -q "function getTripData" "$TRIPS_FILE"; then
        pass "getTripData function defined"
    else
        fail "getTripData function not found"
    fi
    
    # Count trips
    TRIP_COUNT=$(grep -c "title:" "$TRIPS_FILE" 2>/dev/null || echo 0)
    if [[ "$TRIP_COUNT" -gt 20 ]]; then
        pass "Found $TRIP_COUNT trips (expected 25+)"
    elif [[ "$TRIP_COUNT" -gt 0 ]]; then
        warn "Only $TRIP_COUNT trips found"
    else
        fail "No trips found in tripsData"
    fi
    
    # Check for isActive flag
    ACTIVE_COUNT=$(grep -c "isActive:" "$TRIPS_FILE" 2>/dev/null || echo 0)
    if [[ "$ACTIVE_COUNT" -gt 0 ]]; then
        pass "isActive flag found on $ACTIVE_COUNT trips"
    else
        fail "isActive flag not found on any trips"
    fi
    
    # Check for required trip fields
    REQUIRED_FIELDS=("title:" "price:" "image:" "duration:" "difficulty:" "location:")
    for field in "${REQUIRED_FIELDS[@]}"; do
        COUNT=$(grep -c "$field" "$TRIPS_FILE" 2>/dev/null || echo 0)
        if [[ "$COUNT" -gt 20 ]]; then
            pass "Field '$field' found ($COUNT occurrences)"
        else
            warn "Field '$field' may be missing (only $COUNT occurrences)"
        fi
    done
fi

# ============================================
# TEST 6: Common Data Validation
# ============================================
section "6/12" "Common Data Objects Validation"

COMMON_OBJECTS=(
    "commonPickupPoints"
    "commonCancellationPolicy"
    "commonGuidelines"
    "commonFAQs"
)

for obj in "${COMMON_OBJECTS[@]}"; do
    if grep -q "const $obj" "$TRIPS_FILE"; then
        pass "$obj defined"
        
        # Check it has data
        COUNT=$(grep -A 50 "const $obj" "$TRIPS_FILE" | grep -c "{" | head -1)
        if [[ "$COUNT" -gt 2 ]]; then
            pass "$obj has data entries"
        else
            warn "$obj may be empty or incomplete"
        fi
    else
        fail "$obj not found in trips-data.js"
    fi
done

# Check pickup points count (should be 4)
PICKUP_COUNT=$(grep -A 30 "commonPickupPoints" "$TRIPS_FILE" | grep -c 'name:' 2>/dev/null || echo 0)
if [[ "$PICKUP_COUNT" -ge 4 ]]; then
    pass "commonPickupPoints has $PICKUP_COUNT locations"
else
    warn "commonPickupPoints has only $PICKUP_COUNT locations (expected 4)"
fi

# Check cancellation policy tiers (should be 3)
POLICY_COUNT=$(grep -A 20 "commonCancellationPolicy" "$TRIPS_FILE" | grep -c 'days:' 2>/dev/null || echo 0)
if [[ "$POLICY_COUNT" -ge 3 ]]; then
    pass "commonCancellationPolicy has $POLICY_COUNT tiers"
else
    warn "commonCancellationPolicy has only $POLICY_COUNT tiers (expected 3)"
fi

# Check guidelines count (should be 8)
GUIDELINES_COUNT=$(grep -A 60 "commonGuidelines" "$TRIPS_FILE" | grep -c 'title:' 2>/dev/null || echo 0)
if [[ "$GUIDELINES_COUNT" -ge 6 ]]; then
    pass "commonGuidelines has $GUIDELINES_COUNT items"
else
    warn "commonGuidelines has only $GUIDELINES_COUNT items (expected 8)"
fi

# Check FAQs count (should be 10)
FAQ_COUNT=$(grep -c 'q:' "$TRIPS_FILE" 2>/dev/null || echo 0)
if [[ "$FAQ_COUNT" -ge 8 ]]; then
    pass "commonFAQs has $FAQ_COUNT questions"
else
    warn "commonFAQs has only $FAQ_COUNT questions (expected 10)"
fi

# ============================================
# TEST 7: Image Files Check
# ============================================
section "7/12" "Image Files Validation"

# Check trip images directory
if [[ -d "images/trips" ]]; then
    TRIP_IMAGES=$(find images/trips -name "*.jpg" -o -name "*.png" -o -name "*.webp" 2>/dev/null | wc -l)
    if [[ "$TRIP_IMAGES" -gt 20 ]]; then
        pass "Found $TRIP_IMAGES trip images"
    else
        warn "Only $TRIP_IMAGES trip images found"
    fi
else
    fail "images/trips directory not found"
fi

# Check logo exists
if [[ -f "images/logo.jpg" ]] || [[ -f "images/logo.png" ]]; then
    pass "Logo image exists"
else
    warn "Logo image not found"
fi

# Check hero images
HERO_IMAGES=$(find images -name "hero*.jpg" -o -name "hero*.png" 2>/dev/null | wc -l)
if [[ "$HERO_IMAGES" -gt 0 ]]; then
    pass "Found $HERO_IMAGES hero images"
else
    warn "No hero images found"
fi

# ============================================
# TEST 8: Internal Links Check
# ============================================
section "8/12" "Internal Links Validation"

# Check for broken internal links in HTML files
for file in "${HTML_FILES[@]}"; do
    if [[ -f "$file" ]]; then
        # Extract href values for internal links
        LINKS=$(grep -oP 'href="[^"#]*\.html[^"]*"' "$file" 2>/dev/null | grep -v "http" | sed 's/href="//g' | sed 's/"//g' | sort -u)
        
        BROKEN=0
        for link in $LINKS; do
            # Remove query strings
            CLEAN_LINK=$(echo "$link" | cut -d'?' -f1)
            if [[ ! -f "$CLEAN_LINK" ]]; then
                warn "$file links to missing file: $CLEAN_LINK"
                ((BROKEN++))
            fi
        done
        
        if [[ "$BROKEN" -eq 0 ]]; then
            pass "$file has no broken internal links"
        fi
    fi
done

# ============================================
# TEST 9: Script and CSS References
# ============================================
section "9/12" "Resource References Validation"

for file in "${HTML_FILES[@]}"; do
    if [[ -f "$file" ]]; then
        # Check JS references
        JS_REFS=$(grep -oP 'src="js/[^"]*"' "$file" 2>/dev/null | sed 's/src="//g' | sed 's/"//g' | sed 's/?.*//g' | sort -u)
        for ref in $JS_REFS; do
            if [[ -f "$ref" ]]; then
                pass "$file -> $ref exists"
            else
                fail "$file references missing JS: $ref"
            fi
        done
        
        # Check CSS references
        CSS_REFS=$(grep -oP 'href="css/[^"]*"' "$file" 2>/dev/null | sed 's/href="//g' | sed 's/"//g' | sort -u)
        for ref in $CSS_REFS; do
            if [[ -f "$ref" ]]; then
                pass "$file -> $ref exists"
            else
                fail "$file references missing CSS: $ref"
            fi
        done
    fi
done

# ============================================
# TEST 10: Inactive Trip Feature
# ============================================
section "10/12" "Inactive Trip Feature Validation"

# Check CSS for inactive trip styles
if grep -q "trip-inactive" css/style.css; then
    pass "trip-inactive CSS class defined"
else
    fail "trip-inactive CSS class not found"
fi

if grep -q "inactive-trip-banner" css/style.css; then
    pass "inactive-trip-banner CSS defined"
else
    warn "inactive-trip-banner CSS not found"
fi

if grep -q "booking-disabled" css/style.css; then
    pass "booking-disabled CSS defined"
else
    warn "booking-disabled CSS not found"
fi

# Check trip-detail.html handles inactive trips
if grep -q "isActive === false" trip-detail.html; then
    pass "trip-detail.html handles inactive trips"
else
    fail "trip-detail.html doesn't handle inactive trips"
fi

# Check trips.html handles inactive trips
if grep -q "trip.isActive" trips.html; then
    pass "trips.html handles inactive trips"
else
    warn "trips.html may not handle inactive trips"
fi

# ============================================
# TEST 11: Featured Trips Configuration
# ============================================
section "11/12" "Featured Trips Validation"

FEATURED_FILE="js/featured-trips.js"

if [[ -f "$FEATURED_FILE" ]]; then
    if grep -q "featuredTripIds" "$FEATURED_FILE"; then
        pass "featuredTripIds array defined"
        
        # Count featured trips
        FEATURED_COUNT=$(grep -oP '"[a-z0-9-]+"' "$FEATURED_FILE" | wc -l)
        if [[ "$FEATURED_COUNT" -gt 0 ]]; then
            pass "Found $FEATURED_COUNT featured trips"
        else
            warn "No featured trips configured"
        fi
    else
        fail "featuredTripIds not found"
    fi
    
    if grep -q "function getFeaturedTrips" "$FEATURED_FILE"; then
        pass "getFeaturedTrips function defined"
    else
        fail "getFeaturedTrips function not found"
    fi
fi

# ============================================
# TEST 12: Security & Payment
# ============================================
section "12/12" "Security & Payment Validation"

# Check security.js exists and has content
if [[ -f "js/security.js" ]] && [[ -s "js/security.js" ]]; then
    pass "security.js exists and has content"
else
    warn "security.js missing or empty"
fi

# Check razorpay.js exists
if [[ -f "js/razorpay.js" ]] && [[ -s "js/razorpay.js" ]]; then
    pass "razorpay.js exists"
else
    warn "razorpay.js missing or empty"
fi

# Check for Razorpay key in checkout
if grep -q "rzp_live" checkout.html 2>/dev/null || grep -q "rzp_test" checkout.html 2>/dev/null; then
    pass "Razorpay key configured in checkout"
else
    warn "Razorpay key not found in checkout.html"
fi

# Check WhatsApp number
WHATSAPP_COUNT=$(grep -r "7019235581" *.html 2>/dev/null | wc -l)
if [[ "$WHATSAPP_COUNT" -gt 0 ]]; then
    pass "WhatsApp number found in $WHATSAPP_COUNT places"
else
    warn "WhatsApp number not found in HTML files"
fi

# ============================================
# SUMMARY
# ============================================
echo ""
echo "=============================================="
echo "📊 TEST SUMMARY"
echo "=============================================="
echo -e "${GREEN}Passed:${NC}   $PASSED"
echo -e "${RED}Failed:${NC}   $FAILED"
echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
echo ""

if [[ "$FAILED" -gt 0 ]]; then
    echo -e "${RED}❌ TESTS FAILED${NC}"
    echo ""
    exit 1
else
    if [[ "$WARNINGS" -gt 5 ]]; then
        echo -e "${YELLOW}⚠️  TESTS PASSED WITH WARNINGS${NC}"
    else
        echo -e "${GREEN}✅ ALL TESTS PASSED${NC}"
    fi
    echo ""
    exit 0
fi
