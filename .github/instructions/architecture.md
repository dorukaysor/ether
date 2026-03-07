# MONOREPO STRUCTURE

Our project is divided into three main environments. Never mix Astro code with ESP32 C++ code.

- `/core/sentry` - C++ / PlatformIO  
> **Hardware:** ESP32 #1, PZEM-004T, 5V Relay, Hi-Link Power Supply.

-  `/core/avatar` - C++ / PlatformIO  
> **Hardware:** ESP32 #2, 1.3" I2C OLED (SH1106), 12-Bit NeoPixel, KY-040 Encoder.

- `/web` - Astro + React + Tailwind + MongoDB

---

# **Detailed Current and Data Flow**

## **PART 1: The Physical Layer (How the Current Travels)**

This is strictly happening inside the Sentry Unit (the PVC box near wall socket). We are dealing with 220V AC Mains here.

### **The Wall Socket (Input):** 220V AC Live and Neutral wires enter the Sentry enclosure. Immediately, the path splits into two directions.
### **Path A (Powering the Brain):**
- A tap from the Live and Neutral wires goes into the Hi-Link HLK-PM01 module.
- The Hi-Link acts as a transformer, instantly converting the lethal 220V AC into a safe, steady 5V DC.
- This 5V DC flows into the ESP32 (VIN pin) and the 5V Relay module to power them.

### **Path B (Measuring the Appliance):**

- The main Neutral wire flows straight past the electronics and goes directly to the output socket where the appliance (e.g., a gaming PC) plugs in.
- The main Live wire is routed to the PZEM-004T v3.0. First, it connects to the voltage measurement terminal. Then, the wire is threaded through the hole of the Solid Core Coil (CT). As AC current flows through the wire, it creates a magnetic field. The Coil reads this magnetic field without physically touching the copper inside.


### **The Safety Gate (The Relay):**

- After passing through the Coil, the Live wire goes into the COM (Common) port of the 5V Relay.
- It exits through the NO (Normally Open) port and finally reaches the output socket.
- *The Logic:* If the Sentry ESP32 detects danger (e.g., >2500W), it stops sending a 5V signal to the Relay. The mechanical switch inside the Relay snaps open, physically breaking the Live wire connection. The appliance loses power instantly.

## **PART 2: The Data Layer (How the Data Travels)**

This is the journey of a single "Watt" measurement from the moment it is read, to the moment it appears on the   glassmorphic Netlify dashboard.

### **Step 1: Edge Processing (The Sentry)**

- The PZEM-004T's internal chip calculates the raw analog readings from the Coil and converts them into digital numbers (Voltage, Amps, Watts, Energy).
- Every 500 milliseconds, it sends these numbers over a Serial connection (UART) via the RX/TX pins to the Sentry ESP32.
- The Sentry ESP32 packages this data into a C++ struct (a neat little bundle of variables).


### **Step 2: The Wireless Air-Gap (ESP-NOW)**

- The Sentry ESP32 uses its built-in Wi-Fi antenna, but it does not connect to a router.
- Instead, it uses ESP-NOW to shoot the data packet directly through the air via 2.4GHz radio waves, aimed specifically at the MAC Address of the Avatar ESP32 on the desk.
- Why this matters: This isolates the high-voltage Sentry from the internet entirely, making it un-hackable from the outside.


### **Step 3: Local UI & Cloud Dispatch (The Avatar)**

- The Avatar ESP32 catches the ESP-NOW packet.
- Immediately, it updates its physical state. If the Watts are low, it turns the NeoPixel ring Pink and updates the OLED face.
- Simultaneously, the Avatar is connected to the local Wi-Fi router. Every 5 to 10 seconds, it bundles the latest data into a JSON payload and fires an HTTP POST request out to the internet, aimed at the Astro backend URL.


### **Step 4: The Serverless Bridge (Netlify)**

- The HTTP POST request hits https://etherlabs.netlify.app/api/log-energy.
- Netlify instantly spins up a Serverless Edge Function (the Astro backend code).
- The function validates the JSON data, establishes a split-second HTTP connection to the database, and uses the @libsql/client to execute an INSERT command.


### **Step 5: The Database (TursoDB)**

- TursoDB receives the command and writes the new row of telemetry (timestamp, watts, volts, relay status) into its ultra-fast SQLite edge database.
- Netlify gets a "Success" response and goes back to sleep. The entire process (Avatar -> Netlify -> Turso) takes less than 300 milliseconds.


### **Step 6: Frontend Visualization (Short Polling)**

- Open the laptop and load the React/Astro dashboard.
- The frontend runs a useEffect timer. Every 3 seconds, it sends a silent GET request to TursoDB, pulling the 10 most recent data points.
- The React components re-render, updating the sleek Recharts graphs and numbers on the screen to simulate a live data feed.


### **Step 7: AI Emotive Analysis (Gemini 1.5 Pro)**

- When you click "Analyze" on the dashboard (or via a daily cron job), the Astro backend queries TursoDB for the last 24 hours of energy data.
- It sends this array of data to the Google Gemini API with a prompt (e.g., "Act as an emotive robot. Analyze this power data and give a 2-sentence summary of my habits.").
- Gemini returns a natural language insight (e.g., "I was sweating all night! You left the heater running at 1500W until 4 AM. Let's try setting a timer tonight."), which is then displayed on the UI.