#!/usr/bin/env python3
"""
Google Maps Reviews & Photos Scraper
Uses Playwright with stealth mode to extract reviews and photos from Google Maps
"""

import asyncio
import json
import os
import re
from datetime import datetime
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeout
from playwright_stealth import Stealth

# Configuration
GOOGLE_MAPS_URL = "https://www.google.com/maps/search/Team+Weekend+Trekkers+Bangalore"
OUTPUT_FILE = "reviews_data.json"
MAX_REVIEWS = 10
SCROLL_PAUSE_TIME = 2000  # ms

async def scroll_reviews_feed(page, scroll_container, num_scrolls=5):
    """Scroll the reviews feed to load more reviews"""
    for i in range(num_scrolls):
        try:
            await page.evaluate(f'''
                const feed = document.querySelector('{scroll_container}');
                if (feed) {{
                    feed.scrollTop = feed.scrollHeight;
                }}
            ''')
            await page.wait_for_timeout(SCROLL_PAUSE_TIME)
            print(f"  Scroll {i+1}/{num_scrolls} completed")
        except Exception as e:
            print(f"  Scroll error: {e}")
            break

async def extract_reviews(page):
    """Extract review data from the page"""
    reviews = []
    
    # Try multiple selectors for reviews
    review_selectors = [
        '.jftiEf',  # Main review container
        '[data-review-id]',
        '.WMbnJf',
        'div[jslog*="review"]'
    ]
    
    review_elements = []
    for selector in review_selectors:
        try:
            elements = await page.query_selector_all(selector)
            if elements and len(elements) > 0:
                review_elements = elements
                print(f"  Found {len(elements)} reviews using selector: {selector}")
                break
        except:
            continue
    
    if not review_elements:
        print("  No reviews found with standard selectors, trying alternative approach...")
        # Try to find any review-like containers
        review_elements = await page.query_selector_all('[class*="review"], [class*="Review"]')
    
    for i, review_el in enumerate(review_elements[:MAX_REVIEWS]):
        try:
            review_data = {}
            
            # Extract reviewer name
            name_selectors = ['.d4r55', '.WNxzHc', '[class*="name"]', '.Vpc5Fe']
            for sel in name_selectors:
                try:
                    name_el = await review_el.query_selector(sel)
                    if name_el:
                        review_data['name'] = await name_el.inner_text()
                        break
                except:
                    continue
            
            # Extract star rating
            rating_selectors = ['.kvMYJc', '[aria-label*="star"]', '.DU9Pgb', '.fzvQIb']
            for sel in rating_selectors:
                try:
                    rating_el = await review_el.query_selector(sel)
                    if rating_el:
                        aria_label = await rating_el.get_attribute('aria-label')
                        if aria_label:
                            # Extract number from "5 stars" or similar
                            match = re.search(r'(\d+)', aria_label)
                            if match:
                                review_data['rating'] = int(match.group(1))
                                break
                        # Try counting filled stars
                        stars = await rating_el.query_selector_all('.hCCjke, .vzX5Ic, [class*="star"]')
                        if stars:
                            review_data['rating'] = len(stars)
                            break
                except:
                    continue
            
            # Extract review text
            text_selectors = ['.wiI7pd', '.MyEned', '.Jtu6Td', '[class*="text"]', '.review-text']
            for sel in text_selectors:
                try:
                    text_el = await review_el.query_selector(sel)
                    if text_el:
                        review_data['text'] = await text_el.inner_text()
                        break
                except:
                    continue
            
            # Extract date
            date_selectors = ['.rsqaWe', '.DU9Pgb', '[class*="date"]', '.dehysf']
            for sel in date_selectors:
                try:
                    date_el = await review_el.query_selector(sel)
                    if date_el:
                        review_data['date'] = await date_el.inner_text()
                        break
                except:
                    continue
            
            # Extract reviewer photo
            photo_selectors = ['.NBa7we', 'img[class*="photo"]', '.lDY1rd img']
            for sel in photo_selectors:
                try:
                    photo_el = await review_el.query_selector(sel)
                    if photo_el:
                        photo_src = await photo_el.get_attribute('src')
                        if photo_src and not photo_src.startswith('data:'):
                            review_data['reviewer_photo'] = photo_src
                            break
                except:
                    continue
            
            if review_data.get('name') or review_data.get('text'):
                reviews.append(review_data)
                print(f"  Extracted review {i+1}: {review_data.get('name', 'Unknown')}")
        
        except Exception as e:
            print(f"  Error extracting review {i+1}: {e}")
            continue
    
    return reviews

async def extract_photos(page):
    """Extract business photos from the page"""
    photos = []
    
    # Try to click on Photos tab first
    photo_tab_selectors = [
        'button[aria-label*="Photo"]',
        '[data-tab-index="2"]',
        'button:has-text("Photos")',
        '.RWPxGd[aria-label*="photo"]'
    ]
    
    for selector in photo_tab_selectors:
        try:
            photo_tab = await page.query_selector(selector)
            if photo_tab:
                await photo_tab.click()
                await page.wait_for_timeout(2000)
                print("  Clicked Photos tab")
                break
        except:
            continue
    
    # Extract photo URLs
    photo_selectors = [
        '.U39Pmb',  # Photo thumbnails
        '.Uf0tqf img',
        '[class*="gallery"] img',
        '.m6QErb img',
        'img[src*="googleusercontent"]'
    ]
    
    for selector in photo_selectors:
        try:
            photo_elements = await page.query_selector_all(selector)
            for photo_el in photo_elements[:20]:  # Limit to 20 photos
                try:
                    # Get src or data-src
                    src = await photo_el.get_attribute('src')
                    if not src:
                        src = await photo_el.get_attribute('data-src')
                    
                    if src and 'googleusercontent' in src and src not in photos:
                        # Get higher resolution version
                        high_res = re.sub(r'=w\d+-h\d+', '=w800-h600', src)
                        high_res = re.sub(r'=s\d+', '=s800', high_res)
                        photos.append(high_res)
                except:
                    continue
            
            if photos:
                print(f"  Found {len(photos)} photos using selector: {selector}")
                break
        except:
            continue
    
    # Also try to get photos from the main page/overview
    try:
        main_photos = await page.query_selector_all('img[src*="lh5.googleusercontent"], img[src*="lh3.googleusercontent"]')
        for photo_el in main_photos:
            src = await photo_el.get_attribute('src')
            if src and src not in photos:
                high_res = re.sub(r'=w\d+-h\d+', '=w800-h600', src)
                photos.append(high_res)
    except:
        pass
    
    return list(set(photos))  # Remove duplicates

async def scrape_google_reviews():
    """Main scraping function"""
    print("="*60)
    print("GOOGLE MAPS REVIEWS SCRAPER")
    print("="*60)
    
    results = {
        "business_name": "",
        "rating": "",
        "total_reviews": "",
        "reviews": [],
        "photos": [],
        "scraped_at": datetime.now().isoformat()
    }
    
    async with async_playwright() as p:
        print("\n[1] Launching browser...")
        browser = await p.chromium.launch(
            headless=True,
            args=[
                '--no-sandbox', 
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--disable-dev-shm-usage'
            ]
        )
        
        context = await browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            locale='en-US',
            timezone_id='Asia/Kolkata'
        )
        
        page = await context.new_page()
        
        # Apply stealth mode
        print("[2] Applying stealth mode...")
        stealth = Stealth()
        await stealth.apply_stealth_async(page)
        
        try:
            print(f"[3] Navigating to: {GOOGLE_MAPS_URL}")
            await page.goto(GOOGLE_MAPS_URL, wait_until='domcontentloaded', timeout=60000)
            await page.wait_for_timeout(5000)
            
            # Handle Google consent popup if present
            consent_buttons = [
                'button:has-text("Accept all")',
                'button:has-text("Accept")',
                '[aria-label="Accept all"]',
                'form[action*="consent"] button'
            ]
            for btn_sel in consent_buttons:
                try:
                    btn = await page.query_selector(btn_sel)
                    if btn:
                        await btn.click()
                        print("    Accepted consent popup")
                        await page.wait_for_timeout(2000)
                        break
                except:
                    continue
            
            # Check if we got redirected
            current_url = page.url
            print(f"    Current URL: {current_url}")
            
            # Click on the first result if on search page
            first_result_selectors = [
                '.Nv2PK',  # Business result card
                'a[href*="place"]',
                '.hfpxzc'
            ]
            for sel in first_result_selectors:
                try:
                    result = await page.query_selector(sel)
                    if result:
                        await result.click()
                        print("    Clicked on first result")
                        await page.wait_for_timeout(3000)
                        break
                except:
                    continue
            
            # Wait for page to fully load
            await page.wait_for_timeout(2000)
            
            # Extract business name
            name_selectors = ['.DUwDvf', '.qBF1Pd', 'h1', '[data-attrid="title"]']
            for sel in name_selectors:
                try:
                    name_el = await page.query_selector(sel)
                    if name_el:
                        results['business_name'] = await name_el.inner_text()
                        print(f"    Business: {results['business_name']}")
                        break
                except:
                    continue
            
            # Extract overall rating
            rating_selectors = ['.F7nice span', '.ceNzKf', '[class*="rating"]']
            for sel in rating_selectors:
                try:
                    rating_el = await page.query_selector(sel)
                    if rating_el:
                        results['rating'] = await rating_el.inner_text()
                        print(f"    Rating: {results['rating']}")
                        break
                except:
                    continue
            
            # Try to click on Reviews tab
            print("\n[4] Looking for Reviews tab...")
            reviews_tab_selectors = [
                'button[aria-label*="Review"]',
                '[data-tab-index="1"]',
                'button:has-text("Reviews")',
                '.RWPxGd[aria-label*="review"]',
                '[role="tab"]:has-text("Reviews")'
            ]
            
            for selector in reviews_tab_selectors:
                try:
                    tab = await page.query_selector(selector)
                    if tab:
                        await tab.click()
                        await page.wait_for_timeout(2000)
                        print(f"    Clicked Reviews tab")
                        break
                except Exception as e:
                    continue
            
            # Scroll to load more reviews
            print("\n[5] Scrolling to load reviews...")
            scroll_selectors = [
                'div[role="feed"]',
                '.m6QErb.DxyBCb',
                '.m6QErb[aria-label]',
                '.section-layout'
            ]
            
            for scroll_sel in scroll_selectors:
                try:
                    scroll_el = await page.query_selector(scroll_sel)
                    if scroll_el:
                        await scroll_reviews_feed(page, scroll_sel, num_scrolls=5)
                        break
                except:
                    continue
            
            # Extract reviews
            print("\n[6] Extracting reviews...")
            results['reviews'] = await extract_reviews(page)
            print(f"    Total reviews extracted: {len(results['reviews'])}")
            
            # Extract photos
            print("\n[7] Extracting photos...")
            results['photos'] = await extract_photos(page)
            print(f"    Total photos extracted: {len(results['photos'])}")
            
            # Take a screenshot for debugging
            await page.screenshot(path='debug_screenshot.png')
            print("\n    Debug screenshot saved to debug_screenshot.png")
            
        except PlaywrightTimeout as e:
            print(f"ERROR: Page load timeout - {e}")
        except Exception as e:
            print(f"ERROR: {e}")
            import traceback
            traceback.print_exc()
        finally:
            await browser.close()
    
    # Save results to JSON
    print(f"\n[8] Saving results to {OUTPUT_FILE}...")
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    
    print("\n" + "="*60)
    print("SCRAPING COMPLETE")
    print("="*60)
    print(f"Business: {results['business_name']}")
    print(f"Reviews: {len(results['reviews'])}")
    print(f"Photos: {len(results['photos'])}")
    
    return results

if __name__ == "__main__":
    asyncio.run(scrape_google_reviews())
