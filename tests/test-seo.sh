#!/bin/bash
# ============================================
# SEO & ACCESSIBILITY TESTS
# ============================================
# Validates SEO best practices and accessibility
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
echo "🔍 SEO & ACCESSIBILITY TESTS"
echo "=============================================="
echo ""

HTML_FILES=(index.html trips.html trip-detail.html checkout.html about.html contact.html)

# SEO Tests
echo "SEO Validation..."
echo ""

for file in "${HTML_FILES[@]}"; do
    if [[ -f "$file" ]]; then
        echo -e "${YELLOW}Testing: $file${NC}"
        
        # Title tag
        if grep -q "<title>" "$file"; then
            TITLE=$(grep -oP '<title>[^<]*</title>' "$file" | head -1)
            if [[ ${#TITLE} -gt 20 ]]; then
                pass "Has title tag with content"
            else
                warn "Title tag may be too short"
            fi
        else
            fail "Missing title tag"
        fi
        
        # Meta description
        if grep -q 'name="description"' "$file"; then
            pass "Has meta description"
        else
            warn "Missing meta description"
        fi
        
        # Meta keywords (optional but good to have)
        if grep -q 'name="keywords"' "$file"; then
            pass "Has meta keywords"
        else
            warn "Missing meta keywords"
        fi
        
        # Open Graph tags
        if grep -q 'property="og:' "$file"; then
            pass "Has Open Graph tags"
        else
            warn "Missing Open Graph tags"
        fi
        
        # Canonical URL
        if grep -q 'rel="canonical"' "$file"; then
            pass "Has canonical URL"
        else
            warn "Missing canonical URL"
        fi
        
        # H1 tag
        if grep -q "<h1" "$file"; then
            H1_COUNT=$(grep -c "<h1" "$file")
            H1_COUNT="${H1_COUNT//[[:space:]]/}"
            if [[ "$H1_COUNT" -eq 1 ]]; then
                pass "Has exactly one H1 tag"
            else
                warn "Has $H1_COUNT H1 tags (should be 1)"
            fi
        else
            # trip-detail.html generates H1 dynamically, so it's a warning
            if [[ "$file" == "trip-detail.html" ]]; then
                warn "H1 tag is dynamically generated"
            else
                fail "Missing H1 tag"
            fi
        fi
        
        echo ""
    fi
done

# Accessibility Tests
echo "Accessibility Validation..."
echo ""

for file in "${HTML_FILES[@]}"; do
    if [[ -f "$file" ]]; then
        echo -e "${YELLOW}Testing: $file${NC}"
        
        # Lang attribute on html
        if grep -q '<html.*lang=' "$file"; then
            pass "HTML has lang attribute"
        else
            fail "Missing lang attribute on html"
        fi
        
        # Alt text on images
        IMG_COUNT=$(grep -c "<img" "$file" 2>/dev/null || echo "0")
        IMG_COUNT="${IMG_COUNT//[[:space:]]/}"
        ALT_COUNT=$(grep -c 'alt="' "$file" 2>/dev/null || echo "0")
        ALT_COUNT="${ALT_COUNT//[[:space:]]/}"
        
        IMG_COUNT=$(grep -c '<img' "$file" 2>/dev/null || echo "0")
        IMG_COUNT="${IMG_COUNT//[[:space:]]/}"
        ALT_COUNT=$(grep -c 'alt=' "$file" 2>/dev/null || echo "0")
        ALT_COUNT="${ALT_COUNT//[[:space:]]/}"
        
        if [[ "$IMG_COUNT" -gt 0 ]]; then
            if [[ "$ALT_COUNT" -ge "$IMG_COUNT" ]]; then
                pass "Images have alt attributes ($ALT_COUNT/$IMG_COUNT)"
            else
                warn "Some images may be missing alt text ($ALT_COUNT/$IMG_COUNT)"
            fi
        fi
        
        # Form labels
        INPUT_COUNT=$(grep -c "<input\|<select\|<textarea" "$file" 2>/dev/null || echo "0")
        INPUT_COUNT="${INPUT_COUNT//[[:space:]]/}"
        LABEL_COUNT=$(grep -c "<label" "$file" 2>/dev/null || echo "0")
        LABEL_COUNT="${LABEL_COUNT//[[:space:]]/}"
        
        if [[ "$INPUT_COUNT" -gt 0 ]]; then
            if [[ "$LABEL_COUNT" -gt 0 ]]; then
                pass "Form has labels"
            else
                warn "Form inputs may be missing labels"
            fi
        fi
        
        # ARIA landmarks
        if grep -q 'role="\|aria-' "$file"; then
            pass "Has ARIA attributes"
        else
            warn "No ARIA attributes found"
        fi
        
        # Skip to content link
        if grep -q 'skip.*content\|skip-link' "$file"; then
            pass "Has skip to content link"
        fi
        
        echo ""
    fi
done

# robots.txt check
echo "Checking robots.txt..."
if [[ -f "robots.txt" ]]; then
    pass "robots.txt exists"
else
    warn "robots.txt not found"
fi

# sitemap check
echo "Checking sitemap..."
if [[ -f "sitemap.xml" ]]; then
    pass "sitemap.xml exists"
else
    warn "sitemap.xml not found"
fi

echo ""
echo "=============================================="
echo "📊 SEO & ACCESSIBILITY TEST SUMMARY"
echo "=============================================="
echo -e "${GREEN}Passed:${NC}   $PASSED"
echo -e "${RED}Failed:${NC}   $FAILED"
echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
echo ""

if [[ "$FAILED" -gt 0 ]]; then
    echo -e "${RED}❌ SEO/ACCESSIBILITY TESTS FAILED${NC}"
    exit 1
else
    echo -e "${GREEN}✅ SEO/ACCESSIBILITY TESTS PASSED${NC}"
    exit 0
fi
