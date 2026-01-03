#!/bin/bash
# ============================================
# WEBSITE VALIDATION SCRIPT
# ============================================
# Comprehensive checks to ensure the website is not broken
# Run before every commit or deployment
# Usage: ./validate-website.sh
# ============================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

echo ""
echo "================================================"
echo "🔍 WEBSITE VALIDATION - Team Weekend Trekkers"
echo "================================================"
echo ""

# ============================================
# CHECK 1: Required Files Exist
# ============================================
echo -e "${BLUE}[1/8] Checking required files...${NC}"

REQUIRED_FILES=(
    "index.html"
    "trips.html"
    "trip-detail.html"
    "about.html"
    "contact.html"
    "checkout.html"
    "css/style.css"
    "css/responsive.css"
    "css/pages.css"
    "js/main.js"
    "js/trips-data.js"
    "js/featured-trips.js"
    "images/logo.jpg"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo -e "  ${RED}❌ MISSING: $file${NC}"
        ERRORS=$((ERRORS + 1))
    fi
done

if [ $ERRORS -eq 0 ]; then
    echo -e "  ${GREEN}✅ All required files present${NC}"
fi

# ============================================
# CHECK 2: HTML Syntax Validation
# ============================================
echo ""
echo -e "${BLUE}[2/8] Validating HTML files...${NC}"

HTML_FILES=(index.html trips.html trip-detail.html about.html contact.html checkout.html)

for html_file in "${HTML_FILES[@]}"; do
    if [ -f "$html_file" ]; then
        # Check for DOCTYPE
        if ! head -1 "$html_file" | grep -qi "<!DOCTYPE html>"; then
            echo -e "  ${RED}❌ $html_file: Missing DOCTYPE${NC}"
            ERRORS=$((ERRORS + 1))
        fi
        
        # Check for closing </html> tag
        if ! grep -q "</html>" "$html_file"; then
            echo -e "  ${RED}❌ $html_file: Missing closing </html> tag${NC}"
            ERRORS=$((ERRORS + 1))
        fi
        
        # Check for closing </body> tag
        if ! grep -q "</body>" "$html_file"; then
            echo -e "  ${RED}❌ $html_file: Missing closing </body> tag${NC}"
            ERRORS=$((ERRORS + 1))
        fi
        
        # Check for closing </head> tag
        if ! grep -q "</head>" "$html_file"; then
            echo -e "  ${RED}❌ $html_file: Missing closing </head> tag${NC}"
            ERRORS=$((ERRORS + 1))
        fi
        
        # Check that opening tags equal closing tags for important elements
        OPEN_DIV=$(grep -o "<div" "$html_file" | wc -l)
        CLOSE_DIV=$(grep -o "</div>" "$html_file" | wc -l)
        if [ "$OPEN_DIV" -ne "$CLOSE_DIV" ]; then
            echo -e "  ${YELLOW}⚠️  $html_file: Mismatched div tags (open: $OPEN_DIV, close: $CLOSE_DIV)${NC}"
            WARNINGS=$((WARNINGS + 1))
        fi
        
        OPEN_SECTION=$(grep -o "<section" "$html_file" | wc -l)
        CLOSE_SECTION=$(grep -o "</section>" "$html_file" | wc -l)
        if [ "$OPEN_SECTION" -ne "$CLOSE_SECTION" ]; then
            echo -e "  ${YELLOW}⚠️  $html_file: Mismatched section tags (open: $OPEN_SECTION, close: $CLOSE_SECTION)${NC}"
            WARNINGS=$((WARNINGS + 1))
        fi
    fi
done

if [ $ERRORS -eq 0 ]; then
    echo -e "  ${GREEN}✅ HTML structure valid${NC}"
fi

# ============================================
# CHECK 3: JavaScript Syntax Validation
# ============================================
echo ""
echo -e "${BLUE}[3/8] Validating JavaScript files...${NC}"

JS_FILES=(js/main.js js/trips-data.js js/featured-trips.js js/razorpay.js js/security.js)
JS_ERRORS=0

if command -v node &> /dev/null; then
    for js_file in "${JS_FILES[@]}"; do
        if [ -f "$js_file" ]; then
            if ! node -c "$js_file" 2>/dev/null; then
                echo -e "  ${RED}❌ $js_file: Syntax error${NC}"
                node -c "$js_file" 2>&1 | head -5
                JS_ERRORS=$((JS_ERRORS + 1))
                ERRORS=$((ERRORS + 1))
            fi
        fi
    done
    
    # Also check inline JavaScript in HTML files
    for html_file in "${HTML_FILES[@]}"; do
        if [ -f "$html_file" ]; then
            # Extract JavaScript from <script> tags (not src) and validate
            INLINE_JS=$(sed -n '/<script>/,/<\/script>/p' "$html_file" | grep -v '<script>' | grep -v '</script>')
            if [ -n "$INLINE_JS" ]; then
                echo "$INLINE_JS" > /tmp/inline_check.js
                if ! node -c /tmp/inline_check.js 2>/dev/null; then
                    echo -e "  ${RED}❌ $html_file: Inline JavaScript syntax error${NC}"
                    node -c /tmp/inline_check.js 2>&1 | head -3
                    JS_ERRORS=$((JS_ERRORS + 1))
                    ERRORS=$((ERRORS + 1))
                fi
                rm -f /tmp/inline_check.js
            fi
        fi
    done
    
    if [ $JS_ERRORS -eq 0 ]; then
        echo -e "  ${GREEN}✅ All JavaScript files valid${NC}"
    fi
else
    echo -e "  ${YELLOW}⚠️  Node.js not found, skipping JS syntax check${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# ============================================
# CHECK 4: CSS Syntax Validation
# ============================================
echo ""
echo -e "${BLUE}[4/8] Validating CSS files...${NC}"

CSS_FILES=(css/style.css css/responsive.css css/pages.css)
CSS_ERRORS=0

for css_file in "${CSS_FILES[@]}"; do
    if [ -f "$css_file" ]; then
        # Check for unclosed braces
        OPEN_BRACES=$(grep -o "{" "$css_file" | wc -l)
        CLOSE_BRACES=$(grep -o "}" "$css_file" | wc -l)
        if [ "$OPEN_BRACES" -ne "$CLOSE_BRACES" ]; then
            echo -e "  ${RED}❌ $css_file: Mismatched braces (open: $OPEN_BRACES, close: $CLOSE_BRACES)${NC}"
            CSS_ERRORS=$((CSS_ERRORS + 1))
            ERRORS=$((ERRORS + 1))
        fi
        
        # Check for empty file
        if [ ! -s "$css_file" ]; then
            echo -e "  ${RED}❌ $css_file: File is empty${NC}"
            CSS_ERRORS=$((CSS_ERRORS + 1))
            ERRORS=$((ERRORS + 1))
        fi
    fi
done

if [ $CSS_ERRORS -eq 0 ]; then
    echo -e "  ${GREEN}✅ All CSS files valid${NC}"
fi

# ============================================
# CHECK 5: trips-data.js Specific Validation
# ============================================
echo ""
echo -e "${BLUE}[5/8] Validating trips-data.js...${NC}"

TRIPS_FILE="js/trips-data.js"
TRIPS_ERRORS=0

if [ -f "$TRIPS_FILE" ]; then
    # Check for getTripData function
    if ! grep -q "function getTripData" "$TRIPS_FILE"; then
        echo -e "  ${RED}❌ getTripData function is MISSING!${NC}"
        echo -e "     This will cause ALL trip pages to show wrong info!"
        TRIPS_ERRORS=$((TRIPS_ERRORS + 1))
        ERRORS=$((ERRORS + 1))
    else
        echo -e "  ${GREEN}✅ getTripData function found${NC}"
    fi
    
    # Check for tripsData object
    if ! grep -q "const tripsData" "$TRIPS_FILE" && ! grep -q "var tripsData" "$TRIPS_FILE"; then
        echo -e "  ${RED}❌ tripsData object is MISSING!${NC}"
        TRIPS_ERRORS=$((TRIPS_ERRORS + 1))
        ERRORS=$((ERRORS + 1))
    else
        echo -e "  ${GREEN}✅ tripsData object found${NC}"
    fi
    
    # Count trips
    TRIP_COUNT=$(grep -E '^\s+"?[a-z0-9\-]+"?: \{$' "$TRIPS_FILE" | wc -l)
    if [ "$TRIP_COUNT" -ge 20 ]; then
        echo -e "  ${GREEN}✅ Trip count: $TRIP_COUNT trips${NC}"
    elif [ "$TRIP_COUNT" -ge 10 ]; then
        echo -e "  ${YELLOW}⚠️  Trip count: $TRIP_COUNT trips (expected 20+)${NC}"
        WARNINGS=$((WARNINGS + 1))
    else
        echo -e "  ${RED}❌ Only $TRIP_COUNT trips found - file may be corrupted${NC}"
        TRIPS_ERRORS=$((TRIPS_ERRORS + 1))
        ERRORS=$((ERRORS + 1))
    fi
    
    # Check file size
    LINE_COUNT=$(wc -l < "$TRIPS_FILE")
    if [ "$LINE_COUNT" -lt 100 ]; then
        echo -e "  ${RED}❌ File too small ($LINE_COUNT lines) - may be truncated${NC}"
        TRIPS_ERRORS=$((TRIPS_ERRORS + 1))
        ERRORS=$((ERRORS + 1))
    else
        echo -e "  ${GREEN}✅ File size: $LINE_COUNT lines${NC}"
    fi
fi

# ============================================
# CHECK 6: Internal Links Validation
# ============================================
echo ""
echo -e "${BLUE}[6/8] Checking internal links...${NC}"

LINK_ERRORS=0

# Check that linked files exist
for html_file in "${HTML_FILES[@]}"; do
    if [ -f "$html_file" ]; then
        # Extract href links to local files (exclude JS template literals with ${})
        LINKS=$(grep -oP 'href="[^"#:]*"' "$html_file" 2>/dev/null | grep -v "http" | grep -v "mailto" | grep -v "tel" | grep -v "wa.me" | grep -v '\$' | sed 's/href="//g' | sed 's/"//g' | sort | uniq)
        
        for link in $LINKS; do
            # Skip empty links and template literals
            if [ -n "$link" ] && [ "$link" != "/" ] && [[ ! "$link" =~ \$ ]] && [ ! -f "$link" ] && [ ! -d "$link" ]; then
                echo -e "  ${YELLOW}⚠️  $html_file: Broken link '$link'${NC}"
                LINK_ERRORS=$((LINK_ERRORS + 1))
                WARNINGS=$((WARNINGS + 1))
            fi
        done
    fi
done

if [ $LINK_ERRORS -eq 0 ]; then
    echo -e "  ${GREEN}✅ All internal links valid${NC}"
fi

# ============================================
# CHECK 7: Image Files Check
# ============================================
echo ""
echo -e "${BLUE}[7/8] Checking critical images...${NC}"

IMAGE_ERRORS=0

# Check logo exists
if [ ! -f "images/logo.jpg" ] && [ ! -f "images/logo.png" ]; then
    echo -e "  ${RED}❌ Logo image missing${NC}"
    IMAGE_ERRORS=$((IMAGE_ERRORS + 1))
    ERRORS=$((ERRORS + 1))
fi

# Check trips images directory
if [ -d "images/trips" ]; then
    TRIP_IMAGES=$(ls images/trips/*.jpg images/trips/*.png images/trips/*.webp 2>/dev/null | wc -l)
    if [ "$TRIP_IMAGES" -gt 0 ]; then
        echo -e "  ${GREEN}✅ Found $TRIP_IMAGES trip images${NC}"
    else
        echo -e "  ${YELLOW}⚠️  No trip images found in images/trips/${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "  ${RED}❌ images/trips/ directory missing${NC}"
    IMAGE_ERRORS=$((IMAGE_ERRORS + 1))
    ERRORS=$((ERRORS + 1))
fi

if [ $IMAGE_ERRORS -eq 0 ]; then
    echo -e "  ${GREEN}✅ Critical images present${NC}"
fi

# ============================================
# CHECK 8: JSON Files Validation
# ============================================
echo ""
echo -e "${BLUE}[8/8] Validating JSON files...${NC}"

JSON_FILES=(reviews_data.json instagram_fetch_log.json photo_fetch_log.json)
JSON_ERRORS=0

if command -v python3 &> /dev/null; then
    for json_file in "${JSON_FILES[@]}"; do
        if [ -f "$json_file" ]; then
            if ! python3 -m json.tool "$json_file" > /dev/null 2>&1; then
                echo -e "  ${RED}❌ $json_file: Invalid JSON${NC}"
                JSON_ERRORS=$((JSON_ERRORS + 1))
                ERRORS=$((ERRORS + 1))
            fi
        fi
    done
    
    if [ $JSON_ERRORS -eq 0 ]; then
        echo -e "  ${GREEN}✅ All JSON files valid${NC}"
    fi
elif command -v node &> /dev/null; then
    for json_file in "${JSON_FILES[@]}"; do
        if [ -f "$json_file" ]; then
            if ! node -e "JSON.parse(require('fs').readFileSync('$json_file'))" 2>/dev/null; then
                echo -e "  ${RED}❌ $json_file: Invalid JSON${NC}"
                JSON_ERRORS=$((JSON_ERRORS + 1))
                ERRORS=$((ERRORS + 1))
            fi
        fi
    done
    
    if [ $JSON_ERRORS -eq 0 ]; then
        echo -e "  ${GREEN}✅ All JSON files valid${NC}"
    fi
else
    echo -e "  ${YELLOW}⚠️  No JSON validator available (install Python3 or Node.js)${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# ============================================
# SUMMARY
# ============================================
echo ""
echo "================================================"
echo "📊 VALIDATION SUMMARY"
echo "================================================"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}"
    echo "  ✅ ALL CHECKS PASSED!"
    echo "  Website is ready for deployment."
    echo -e "${NC}"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}"
    echo "  ⚠️  $WARNINGS warning(s) found"
    echo "  No critical errors - safe to deploy."
    echo -e "${NC}"
    exit 0
else
    echo -e "${RED}"
    echo "  ❌ $ERRORS error(s) and $WARNINGS warning(s) found"
    echo "  Please fix errors before deploying!"
    echo -e "${NC}"
    exit 1
fi
