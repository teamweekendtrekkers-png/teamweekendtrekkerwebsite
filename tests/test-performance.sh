#!/bin/bash
# ============================================
# PERFORMANCE TESTS
# ============================================
# Checks for performance best practices
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
echo "⚡ PERFORMANCE TESTS"
echo "=============================================="
echo ""

# File size checks
echo "Checking file sizes..."

# Check HTML file sizes (should be < 100KB each)
for file in *.html; do
    if [[ -f "$file" ]]; then
        SIZE=$(wc -c < "$file")
        SIZE_KB=$((SIZE / 1024))
        if [[ "$SIZE_KB" -lt 100 ]]; then
            pass "$file size: ${SIZE_KB}KB (OK)"
        elif [[ "$SIZE_KB" -lt 200 ]]; then
            warn "$file size: ${SIZE_KB}KB (consider optimizing)"
        else
            fail "$file size: ${SIZE_KB}KB (too large)"
        fi
    fi
done

echo ""
echo "Checking CSS file sizes..."

# Check CSS file sizes (should be < 150KB total)
TOTAL_CSS=0
for file in css/*.css; do
    if [[ -f "$file" ]]; then
        SIZE=$(wc -c < "$file")
        SIZE_KB=$((SIZE / 1024))
        TOTAL_CSS=$((TOTAL_CSS + SIZE))
        if [[ "$SIZE_KB" -lt 100 ]]; then
            pass "$file size: ${SIZE_KB}KB"
        else
            warn "$file size: ${SIZE_KB}KB (large)"
        fi
    fi
done
TOTAL_CSS_KB=$((TOTAL_CSS / 1024))
echo -e "  Total CSS: ${TOTAL_CSS_KB}KB"

echo ""
echo "Checking JS file sizes..."

# Check JS file sizes
TOTAL_JS=0
for file in js/*.js; do
    if [[ -f "$file" ]]; then
        SIZE=$(wc -c < "$file")
        SIZE_KB=$((SIZE / 1024))
        TOTAL_JS=$((TOTAL_JS + SIZE))
        if [[ "$SIZE_KB" -lt 100 ]]; then
            pass "$file size: ${SIZE_KB}KB"
        else
            warn "$file size: ${SIZE_KB}KB (consider minifying)"
        fi
    fi
done
TOTAL_JS_KB=$((TOTAL_JS / 1024))
echo -e "  Total JS: ${TOTAL_JS_KB}KB"

echo ""
echo "Checking image sizes..."

# Check large images (> 500KB)
LARGE_IMAGES=0
if [[ -d "images" ]]; then
    while IFS= read -r -d '' file; do
        SIZE=$(wc -c < "$file")
        SIZE_KB=$((SIZE / 1024))
        if [[ "$SIZE_KB" -gt 500 ]]; then
            warn "Large image: $file (${SIZE_KB}KB)"
            ((LARGE_IMAGES++))
        fi
    done < <(find images -type f \( -name "*.jpg" -o -name "*.png" -o -name "*.webp" \) -print0 2>/dev/null)
    
    if [[ "$LARGE_IMAGES" -eq 0 ]]; then
        pass "No images over 500KB"
    else
        warn "$LARGE_IMAGES images over 500KB (consider compressing)"
    fi
fi

echo ""
echo "Checking for performance optimizations..."

# Check for async/defer on scripts
for file in *.html; do
    if [[ -f "$file" ]]; then
        EXTERNAL_SCRIPTS=$(grep -c '<script src=' "$file" 2>/dev/null || echo "0")
        EXTERNAL_SCRIPTS="${EXTERNAL_SCRIPTS//[[:space:]]/}"
        ASYNC_DEFER=$(grep -c 'async\|defer' "$file" 2>/dev/null || echo "0")
        ASYNC_DEFER="${ASYNC_DEFER//[[:space:]]/}"
        
        if [[ "$EXTERNAL_SCRIPTS" -gt 0 ]]; then
            if [[ "$ASYNC_DEFER" -gt 0 ]]; then
                pass "$file uses async/defer on some scripts"
            else
                warn "$file doesn't use async/defer on scripts"
            fi
        fi
    fi
done

# Check for lazy loading on images
for file in *.html; do
    if [[ -f "$file" ]]; then
        if grep -q 'loading="lazy"' "$file"; then
            pass "$file uses lazy loading"
        else
            warn "$file doesn't use lazy loading for images"
        fi
    fi
done

# Check for external fonts optimization
for file in *.html; do
    if [[ -f "$file" ]]; then
        if grep -q 'fonts.googleapis.com' "$file"; then
            if grep -q 'display=swap' "$file"; then
                pass "$file has font-display: swap"
            else
                warn "$file missing font-display: swap"
            fi
        fi
    fi
done

# Check for minification indicators
echo ""
echo "Checking for minification..."
CSS_LINES=$(wc -l < css/style.css 2>/dev/null || echo 0)
if [[ "$CSS_LINES" -lt 100 ]]; then
    pass "CSS appears to be minified"
else
    warn "CSS could be minified (${CSS_LINES} lines)"
fi

echo ""
echo "=============================================="
echo "📊 PERFORMANCE TEST SUMMARY"
echo "=============================================="
echo -e "${GREEN}Passed:${NC}   $PASSED"
echo -e "${RED}Failed:${NC}   $FAILED"
echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
echo ""

if [[ "$FAILED" -gt 0 ]]; then
    echo -e "${RED}❌ PERFORMANCE TESTS FAILED${NC}"
    exit 1
else
    echo -e "${GREEN}✅ PERFORMANCE TESTS PASSED${NC}"
    exit 0
fi
