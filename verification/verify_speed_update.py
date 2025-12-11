
import os
from playwright.sync_api import sync_playwright

def test_speed_update():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Load the local index.html file
        cwd = os.getcwd()
        page.goto(f"file://{cwd}/index.html")

        # Wait for app to initialize
        page.wait_for_load_state("domcontentloaded")

        # Set role to student to initialize map and listeners
        page.evaluate("app.setRole('student')")

        # Simulate a bus (Bus K1) appearing with speed 10
        print("Simulating Bus K1 at 10 km/h...")
        page.evaluate("""
            app.handleLocationUpdate({
                id: 'K1',
                route: 'Kuril (To UIU)',
                lat: 23.79790,
                lng: 90.44970,
                speed: 10,
                ts: Date.now()
            });
        """)

        # Open bottom sheet to see the list
        # The bottom sheet is toggled by clicking the handle
        # But we can just inspect the DOM. The list is inside #bus-list

        # Wait for the bus item to appear
        page.wait_for_selector("#bus-K1")

        # Check initial speed
        speed_element = page.locator("#speed-K1")
        initial_speed = speed_element.inner_text()
        print(f"Initial Speed: {initial_speed}")
        if initial_speed != "10":
            print("ERROR: Initial speed incorrect!")

        # Take screenshot of initial state
        page.screenshot(path="verification/speed_initial.png")

        # Simulate the SAME bus updating speed to 50 km/h
        print("Simulating Bus K1 update to 50 km/h...")
        page.evaluate("""
            app.handleLocationUpdate({
                id: 'K1',
                route: 'Kuril (To UIU)',
                lat: 23.79800,
                lng: 90.44980,
                speed: 50,
                ts: Date.now()
            });
        """)

        # Wait for UI update (give it a moment, though it should be instant)
        page.wait_for_timeout(500)

        # Check updated speed
        updated_speed = speed_element.inner_text()
        print(f"Updated Speed: {updated_speed}")

        if updated_speed == "50":
            print("SUCCESS: Speed updated correctly!")
        else:
            print(f"FAILURE: Speed did not update. Expected 50, got {updated_speed}")

        # Take final screenshot
        page.screenshot(path="verification/speed_updated.png")

        browser.close()

if __name__ == "__main__":
    test_speed_update()
