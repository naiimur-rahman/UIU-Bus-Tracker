# 🚌 UIU Bus Tracker

[![Live Demo](https://img.shields.io/badge/demo-online-green.svg)](https://your-demo-link-here.com)
[![Status](https://img.shields.io/badge/status-active-success.svg)]()
[![License](https://img.shields.io/badge/license-MIT-blue.svg)]()

> **Next Gen Campus Transport.** A real-time, lightweight geolocation tracking system designed for United International University students and drivers.

## ⚡ Overview
**UIU Bus Tracker** is a Single Page Application (SPA) that bridges the gap between students and university transport...
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>UIU Bus Tracker - Documentation</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1, h2, h3 { color: #2c3e50; }
        h1 { border-bottom: 2px solid #eaecef; padding-bottom: 10px; }
        h2 { border-bottom: 1px solid #eaecef; padding-bottom: 5px; margin-top: 30px; }
        code { background-color: #f6f8fa; padding: 2px 4px; border-radius: 3px; font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace; font-size: 85%; }
        pre { background-color: #f6f8fa; padding: 16px; border-radius: 6px; overflow: auto; }
        blockquote { border-left: 4px solid #dfe2e5; color: #6a737d; padding-left: 15px; margin: 0; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th, td { border: 1px solid #dfe2e5; padding: 10px; text-align: center; }
        .badge { vertical-align: middle; margin-right: 5px; }
        .screenshot { width: 100%; max-width: 800px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    </style>
</head>
<body>

    <header style="text-align: center; margin-bottom: 40px;">
        <h1>🚌 UIU Bus Tracker</h1>
        
        <div style="margin: 20px 0;">
            <a href="#"><img src="https://img.shields.io/badge/demo-online-green.svg" alt="Live Demo" class="badge"></a>
            <img src="https://img.shields.io/badge/status-active-success.svg" alt="Status" class="badge">
            <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License" class="badge">
        </div>

        <blockquote>
            <strong>Next Gen Campus Transport.</strong> A real-time, lightweight geolocation tracking system designed for United International University students and drivers.
        </blockquote>

        <br>
        <img src="https://via.placeholder.com/800x400?text=UIU+Bus+Tracker+Screenshot" alt="App Screenshot" class="screenshot">
    </header>

    <section>
        <h2>⚡ Overview</h2>
        <p>
            <strong>UIU Bus Tracker</strong> is a Single Page Application (SPA) that bridges the gap between students and university transport. It eliminates the uncertainty of waiting by providing live, low-latency location updates of university buses on an interactive map.
        </p>
        <p>
            Built with a <strong>Mobile-First</strong> approach, it features a modern Glassmorphism UI, Dark Mode support, and efficient battery usage for drivers.
        </p>
    </section>

    <section>
        <h2>✨ Key Features</h2>
        
        <h3>🎓 For Students</h3>
        <ul>
            <li><strong>Live Map Tracking:</strong> Watch buses move in real-time on an interactive OpenStreetMap interface.</li>
            <li><strong>Instant Updates:</strong> Powered by MQTT for sub-second latency (faster than standard HTTP polling).</li>
            <li><strong>Bus Details:</strong> Tap any bus to see its route (Kuril, Notun Bazar, etc.) and active status.</li>
            <li><strong>Dark Mode:</strong> Fully supported system-wide dark/light theme toggling.</li>
        </ul>

        <h3>🚍 For Drivers</h3>
        <ul>
            <li><strong>One-Tap Broadcast:</strong> Simple "Start Trip" button to begin sharing location.</li>
            <li><strong>Smart Routing:</strong> Automatic ID assignment based on selected routes (e.g., Kuril-1, Kuril-2).</li>
            <li><strong>Screen Wake Lock:</strong> Prevents the phone screen from turning off while driving.</li>
            <li><strong>Battery Efficient:</strong> Optimized GPS location strategies to save battery.</li>
        </ul>
    </section>

    <section>
        <h2>🛠️ Tech Stack</h2>
        <ul>
            <li><strong>Frontend:</strong> HTML5, <a href="https://tailwindcss.com/" target="_blank">Tailwind CSS</a> (CDN)</li>
            <li><strong>Logic:</strong> Vanilla JavaScript (ES6+)</li>
            <li><strong>Mapping:</strong> <a href="https://leafletjs.com/" target="_blank">Leaflet.js</a> & OpenStreetMap</li>
            <li><strong>Real-time Protocol:</strong> <a href="https://mqtt.org/" target="_blank">MQTT</a> (via WebSockets)</li>
            <li><strong>Broker:</strong> HiveMQ Cloud</li>
            <li><strong>Icons:</strong> FontAwesome 6</li>
        </ul>
    </section>

    <section>
        <h2>🚀 Getting Started</h2>
        <p>Since this project is built as a standalone file for simplicity, deployment is instant.</p>

        <h3>1. Run Locally</h3>
        <p>Simply download the <code>index.html</code> file and open it in any modern browser.</p>
        <pre>
# Clone the repository
git clone https://github.com/yourusername/UIU-Bus-Tracker.git

# Open the folder
cd UIU-Bus-Tracker

# Double click index.html to run
</pre>

        <h3>2. Configuration (Optional)</h3>
        <p>The project is currently configured to use a public HiveMQ broker. To use your own:</p>
        <ol>
            <li>Open <code>index.html</code>.</li>
            <li>Locate the <code>const CONFIG</code> object in the script section.</li>
            <li>Update the <code>mqtt</code> credentials with your own broker details.</li>
        </ol>
    </section>

    <section>
        <h2>📸 Screenshots</h2>
        <table>
            <thead>
                <tr>
                    <th>Landing Page</th>
                    <th>Live Map (Dark Mode)</th>
                    <th>Driver Dashboard</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td><img src="https://via.placeholder.com/200x400?text=Landing" alt="Landing Page" width="150"></td>
                    <td><img src="https://via.placeholder.com/200x400?text=Map" alt="Map View" width="150"></td>
                    <td><img src="https://via.placeholder.com/200x400?text=Driver" alt="Driver View" width="150"></td>
                </tr>
            </tbody>
        </table>
    </section>

    <footer style="margin-top: 50px; border-top: 1px solid #eaecef; padding-top: 20px;">
        <h2>👨‍💻 Author</h2>
        <p>
            <strong>Naimur Rahman</strong><br>
            <a href="https://github.com/naiimur-rahman">GitHub Profile</a> | 
            <a href="https://www.facebook.com/naiimurr/">Facebook</a>
        </p>
        <p><em>Made with ❤️ for UIU</em></p>
    </footer>

</body>
</html>
