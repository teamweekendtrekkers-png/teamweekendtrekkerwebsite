#!/bin/bash
# ============================================
# MOBILE RESPONSIVE TESTS
# ============================================
# Checks for mobile-responsive features
# ============================================



cd "$(dirname "$0")/.." || exit 1

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASSED=0
FAILED=0
WARNINGS=0

pass() { echo -e "  ${GREEN}✓${NC} $1"; ((PASSED++)); }
fail() { echo -e "  ${RED}✗${NC} $1"; ((FAILED++)); }
warn() { echo -e "  ${YELLOW}⚠${NC} $1"; ((WARNINGS++)); }

echo ""
echo "=============================================="
echo "📱 MOBILE RESPONSIVE TESTS"
echo "=============================================="
echo ""

HTML_FILES=(index.html trips.html trip-detail.html checkout.html about.html contact.html)
CSS_FILE="css/responsive.css"

# Test 1: Viewport meta tag
echo "Testing viewport meta tags..."
for file in "${HTML_FILES[@]}"; do
    if [[ -f "$file" ]]; then
        if grep -q 'name="viewport"' "$file"; then
            if grep -q 'width=device-width' "$file"; then
                pass "$file has proper viewport meta"
            else
                warn "$file viewport missing width=device-width"
            fi
        else
            fail "$file missing viewport meta tag"
        fi
    fi
done

echo ""
echo "Testing responsive.css..."

if [[ -f "$CSS_FILE" ]]; then
    # Check for media queries
    MEDIA_QUERIES=$(grep -c "@media" "$CSS_FILE" 2>/dev/null || echo 0)
    if [[ "$MEDIA_QUERIES" -gt 3 ]]; then
        pass "Found $MEDIA_QUERIES media queries"
    else
        warn "Only $MEDIA_QUERIES media queries found"
    fi
    
    # Check for common breakpoints
    if grep -q "max-width: 768px" "$CSS_FILE"; then
        pass "Tablet breakpoint (768px) defined"
    else
        warn "Tablet breakpoint (768px) not found"
    fi
    
    if grep -q "max-width: 480px" "$CSS_FILE" || grep -q "max-width: 576px" "$CSS_FILE"; then
        pass "Mobile breakpoint defined"
    else
        warn "Mobile breakpoint not found"
    fi
    
    if grep -q "max-width: 992px" "$CSS_FILE" || grep -q "max-width: 1024px" "$CSS_FILE"; then
        pass "Desktop breakpoint defined"
    else
        warn "Desktop breakpoint not found"
    fi
    
    # Check for flex/grid responsive styles
    if grep -q "flex-direction: column" "$CSS_FILE"; then
        pass "Mobile flex-direction styles found"
    else
        warn "No mobile flex-direction styles"
    fi
    
    if grep -q "grid-template-columns" "$CSS_FILE"; then
        pass "Responsive grid styles found"
    else
        warn "No responsive grid styles"
    fi
else
    fail "responsive.css not found"
fi

echo ""
echo "Testing style.css mobile features..."

STYLE_FILE="css/style.css"
if [[ -f "$STYLE_FILE" ]]; then
    # Check for mobile menu
    if grep -q "mobile-menu\|hamburger\|nav-toggle" "$STYLE_FILE"; then
        pass "Mobile menu styles found"
    else
        warn "Mobile menu styles not found"
    fi
    
    # Check for touch-friendly styles
    if grep -q "touch-action\|tap-highlight" "$STYLE_FILE"; then
        pass "Touch-friendly styles found"
    else
        warn "No explicit touch-friendly styles"
    fi
fi

echo ""
echo "Testing HTML mobile features..."

for file in "${HTML_FILES[@]}"; do
    if [[ -f "$file" ]]; then
        # Check for mobile menu toggle
        if grep -q "mobile-menu\|nav-toggle\|hamburger" "$file"; then
            pass "$file has mobile menu elements"
        fi
    fi
done

echo ""
echo "=============================================="
echo "📊 MOBILE RESPONSIVE TEST SUMMARY"
echo "=============================================="
echo -e "${GREEN}Passed:${NC}   $PASSED"
echo -e "${RED}Failed:${NC}   $FAILED"
echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
echo ""

if [[ "$FAILED" -gt 0 ]]; then
    echo -e "${RED}❌ MOBILE TESTS FAILED${NC}"
    exit 1
else
    echo -e "${GREEN}✅ MOBILE TESTS PASSED${NC}"
    exit 0
fi
