#!/bin/bash
# ============================================
# RUN ALL TESTS - Comprehensive Test Suite
# ============================================
# Usage: ./tests/run-all-tests.sh
# ============================================



cd "$(dirname "$0")/.." || exit 1

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║      TEAM WEEKEND TREKKERS - COMPREHENSIVE TEST SUITE        ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "Date: $(date '+%Y-%m-%d %H:%M:%S')"
echo "Directory: $(pwd)"
echo ""

TESTS_PASSED=0
TESTS_FAILED=0
TESTS_SKIPPED=0

run_test() {
    local test_name="$1"
    local test_script="$2"
    
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Running: ${test_name}${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    if [[ -f "$test_script" ]]; then
        chmod +x "$test_script"
        if "$test_script"; then
            echo -e "${GREEN}✓ ${test_name} PASSED${NC}"
            ((TESTS_PASSED++))
        else
            echo -e "${RED}✗ ${test_name} FAILED${NC}"
            ((TESTS_FAILED++))
        fi
    else
        echo -e "${YELLOW}⚠ ${test_name} SKIPPED (script not found)${NC}"
        ((TESTS_SKIPPED++))
    fi
}

# Run all test suites
run_test "Website Validation" "tests/test-website.sh"
run_test "Trip Data Integrity" "tests/test-trip-data.sh"
run_test "Mobile Responsive" "tests/test-mobile.sh"
run_test "SEO & Accessibility" "tests/test-seo.sh"
run_test "Performance" "tests/test-performance.sh"

# Final Summary
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    FINAL TEST SUMMARY                         ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo -e "  ${GREEN}Passed:${NC}  $TESTS_PASSED"
echo -e "  ${RED}Failed:${NC}  $TESTS_FAILED"
echo -e "  ${YELLOW}Skipped:${NC} $TESTS_SKIPPED"
echo ""

if [[ "$TESTS_FAILED" -gt 0 ]]; then
    echo -e "${RED}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║                    ❌ TESTS FAILED                           ║${NC}"
    echo -e "${RED}╚══════════════════════════════════════════════════════════════╝${NC}"
    exit 1
else
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                    ✅ ALL TESTS PASSED                       ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
    exit 0
fi
