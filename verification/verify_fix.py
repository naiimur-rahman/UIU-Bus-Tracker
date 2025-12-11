from playwright.sync_api import sync_playwright, expect
import time
import re

def verify_app(page):
    # Navigate
    page.goto("http://localhost:8080")
    print("Navigated to home")

    # Select Driver Role
    page.click("text=Start a Trip")

    # Select Route
    page.click("text=Kuril")

    # Confirm Direction
    page.click("text=Going to Campus")

    # Wait for Dashboard
    page.wait_for_selector("#view-driver-dashboard.view-active", state="visible")
    print("Dashboard visible")

    # Override geolocation for testing speed
    page.context.grant_permissions(['geolocation'])
    page.context.set_geolocation({'latitude': 23.79790, 'longitude': 90.44970})

    # Click Start Trip
    start_btn = page.locator("#broadcast-btn")
    start_btn.click()
    print("Clicked Start Trip")

    # Verify button turns red
    expect(start_btn).to_have_text("STOP TRIP")
    # FIX: Regex for class check
    expect(start_btn).to_have_class(re.compile(r"bg-red-500"))
    print("Trip Started")

    page.screenshot(path="verification/trip_active.png")

    # Stop Trip
    start_btn.click()
    print("Clicked Stop Trip")

    # Verify Summary Modal
    modal = page.locator("#trip-summary-modal")
    expect(modal).to_have_css("opacity", "1")
    print("Summary Modal Visible")

    page.screenshot(path="verification/trip_summary.png")

    # Close Summary
    close_btn = page.locator("text=Close")
    close_btn.click()
    print("Clicked Close")

    # Verify landing page
    landing = page.locator("#view-landing")
    expect(landing).to_have_class(re.compile(r"view-active"))
    print("Returned to Landing")

    # IMMEDIATE RE-ENTRY TEST (The Bug Fix)
    print("Starting Immediate Re-entry Test...")
    page.click("text=Start a Trip")
    page.click("text=Kuril")
    page.click("text=Going to Campus")

    page.wait_for_selector("#view-driver-dashboard.view-active", state="visible")

    # Check if confetti is gone/reset (implicit by being able to click button)
    start_btn.click()
    print("Clicked Start Trip (2nd time)")

    # Verify button turns red again
    expect(start_btn).to_have_text("STOP TRIP")
    expect(start_btn).to_have_class(re.compile(r"bg-red-500"))
    print("Trip Started Successfully (2nd time)")

    page.screenshot(path="verification/trip_active_2.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        try:
            verify_app(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()
