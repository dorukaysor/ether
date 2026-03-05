// ─────────────────────────────────────────────────────────────────────────────
// E.T.H.E.R.  —  AVATAR UNIT
// ESP32 #2 | 1.3" SH1106 OLED | NeoPixel Ring | KY-040 Encoder
//
// Responsibilities:
//   1. Receive EnergyPacket from Sentry via ESP-NOW
//   2. Drive emotive state machine → NeoPixel colour + OLED RoboEyes
//   3. POST JSON readings to Astro backend every 10 seconds
//   4. Poll /api/relay every 5 seconds — honour relay commands from dashboard
//   5. Poll /api/config on boot and every 60 seconds — update thresholds
//
// Wiring:
//   OLED SDA  → GPIO21
//   OLED SCL  → GPIO22
//   NeoPixel  → GPIO4   (12 LEDs)
//   Encoder CLK → GPIO34
//   Encoder DT  → GPIO35
//   Encoder SW  → GPIO32
// ─────────────────────────────────────────────────────────────────────────────

#include <Arduino.h>
#include <esp_now.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Adafruit_NeoPixel.h>
#include <U8g2lib.h>
#include <Wire.h>

// ── Configuration — edit these ───────────────────────────────────────────────
// Sentry MAC address — paste from Sentry serial output
uint8_t sentryMac[6] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF}; // ← update me

const char* WIFI_SSID  = "YOUR_SSID";      // ← update me
const char* WIFI_PASS  = "YOUR_PASSWORD";  // ← update me

// Dashboard base URL (no trailing slash)
const char* SERVER_URL    = "http://192.168.1.100:4321"; // ← update me
const char* API_SECRET    = "true";   // must match .env API_SECRET

// ── Pin definitions ───────────────────────────────────────────────────────────
#define NEO_PIN      4
#define NEO_COUNT   12
#define ENC_CLK     34
#define ENC_DT      35
#define ENC_SW      32

// ── Peripherals ───────────────────────────────────────────────────────────────
Adafruit_NeoPixel ring(NEO_COUNT, NEO_PIN, NEO_GRB + NEO_KHZ800);
U8G2_SH1106_128X64_NONAME_F_HW_I2C oled(U8G2_R0, U8X8_PIN_NONE);

// ── Shared data packet (must match Sentry exactly) ───────────────────────────
#pragma pack(push, 1)
struct EnergyPacket {
    float    voltage;
    float    current;
    float    power;
    float    energy;
    float    frequency;
    float    power_factor;
    bool     relay_state;
    uint8_t  emotive_state;
};
#pragma pack(pop)

// ── State ─────────────────────────────────────────────────────────────────────
static EnergyPacket latest     = {};
static bool         hasData    = false;
static bool         relayState = true;   // true = ON

// Thresholds (updated from /api/config)
static float  warnThreshW   = 1000.0f;
static float  critThreshW   = 2500.0f;
static int    frustMinutes  = 15;
static int    postInterval  = 10;  // seconds
static int    oledTimeout   = 5;   // seconds per OLED mode

// Emotive colours (GRB order via NeoPixel)
static const uint32_t EMOTIVE_COLORS[] = {
    0x00F5FF,  // 0 Idle        Cyan
    0xFF69B4,  // 1 Happy       Pink
    0xFFE600,  // 2 Dizzy       Yellow
    0xB800FF,  // 3 Frustrated  Purple
    0xFF2020,  // 4 Angry       Red
};

static const char* EMOTIVE_NAMES[] = {
    "Idle", "Happy", "Dizzy", "Frustrated", "Angry"
};

// OLED display modes
enum OledMode { MODE_EYES = 0, MODE_READINGS, MODE_STATE, MODE_COUNT };
static OledMode    oledMode     = MODE_EYES;
static uint32_t    oledLastSwap = 0;
static uint32_t    lastPost     = 0;
static uint32_t    lastRelay    = 0;
static uint32_t    lastConfig   = 0;

// ── NeoPixel helpers ──────────────────────────────────────────────────────────
void setRingColor(uint32_t color, uint8_t brightness = 80) {
    ring.setBrightness(brightness);
    for (int i = 0; i < NEO_COUNT; i++) ring.setPixelColor(i, color);
    ring.show();
}

// Breathing effect — call repeatedly from loop
void breatheRing(uint32_t color) {
    static uint32_t t     = 0;
    static bool     up    = true;
    static uint8_t  level = 10;

    if (millis() - t < 20) return;
    t = millis();

    if (up)  { if (++level >= 120) up = false; }
    else     { if (--level <=  10) up = true;  }

    ring.setBrightness(level);
    for (int i = 0; i < NEO_COUNT; i++) ring.setPixelColor(i, color);
    ring.show();
}

// ── OLED: simple RoboEyes ─────────────────────────────────────────────────────
struct Eye { int cx, cy, w, h; };

void drawEyes(int state) {
    oled.clearBuffer();

    // Left eye centre at (42, 32), right at (86, 32)
    Eye L = {42, 32, 28, 20};
    Eye R = {86, 32, 28, 20};

    switch (state) {
        case 0: // Idle — normal oval eyes
            oled.drawEllipse(L.cx, L.cy, L.w/2, L.h/2, U8G2_DRAW_ALL);
            oled.drawEllipse(R.cx, R.cy, R.w/2, R.h/2, U8G2_DRAW_ALL);
            break;
        case 1: // Happy — arched upward (happy squint)
            oled.drawArc(L.cx, L.cy + 6, 12, 210, 330);
            oled.drawArc(R.cx, R.cy + 6, 12, 210, 330);
            // Rosy cheeks
            oled.drawEllipse(L.cx, L.cy + 14, 6, 3, U8G2_DRAW_ALL);
            oled.drawEllipse(R.cx, R.cy + 14, 6, 3, U8G2_DRAW_ALL);
            break;
        case 2: // Dizzy — spinning cross (X eyes)
            oled.drawLine(L.cx-10, L.cy-10, L.cx+10, L.cy+10);
            oled.drawLine(L.cx+10, L.cy-10, L.cx-10, L.cy+10);
            oled.drawLine(R.cx-10, R.cy-10, R.cx+10, R.cy+10);
            oled.drawLine(R.cx+10, R.cy-10, R.cx-10, R.cy+10);
            break;
        case 3: // Frustrated — angled eyebrows, squinting
            oled.drawEllipse(L.cx, L.cy + 4, L.w/2, L.h/2 - 4, U8G2_DRAW_ALL);
            oled.drawEllipse(R.cx, R.cy + 4, R.w/2, R.h/2 - 4, U8G2_DRAW_ALL);
            oled.drawLine(L.cx - 14, L.cy - 14, L.cx + 14, L.cy - 10);  // left brow
            oled.drawLine(R.cx - 14, R.cy - 10, R.cx + 14, R.cy - 14);  // right brow
            break;
        case 4: // Angry — narrow diagonal eyes, heavy brows
            oled.drawEllipse(L.cx, L.cy + 6, L.w/2, 5, U8G2_DRAW_ALL);
            oled.drawEllipse(R.cx, R.cy + 6, R.w/2, 5, U8G2_DRAW_ALL);
            oled.setDrawColor(0);
            oled.drawBox(L.cx - 14, L.cy - 10, 28, 10);  // clip top of left eye
            oled.drawBox(R.cx - 14, R.cy - 10, 28, 10);  // clip top of right eye
            oled.setDrawColor(1);
            oled.drawLine(L.cx - 14, L.cy - 12, L.cx + 14, L.cy - 6);
            oled.drawLine(R.cx - 14, R.cy - 6,  R.cx + 14, R.cy - 12);
            break;
    }

    oled.sendBuffer();
}

void drawReadings() {
    oled.clearBuffer();
    oled.setFont(u8g2_font_5x7_tf);

    char buf[32];
    snprintf(buf, sizeof(buf), "V  %.1f V",   latest.voltage);      oled.drawStr(0,  10, buf);
    snprintf(buf, sizeof(buf), "A  %.3f A",   latest.current);      oled.drawStr(0,  22, buf);
    snprintf(buf, sizeof(buf), "W  %.1f W",   latest.power);        oled.drawStr(0,  34, buf);
    snprintf(buf, sizeof(buf), "Hz %.2f",     latest.frequency);    oled.drawStr(0,  46, buf);
    snprintf(buf, sizeof(buf), "PF %.3f",     latest.power_factor); oled.drawStr(64, 46, buf);
    snprintf(buf, sizeof(buf), "E  %.4f kWh", latest.energy);       oled.drawStr(0,  58, buf);

    oled.sendBuffer();
}

void drawState() {
    oled.clearBuffer();
    oled.setFont(u8g2_font_9x15B_tf);

    const char* name = (latest.emotive_state < 5)
        ? EMOTIVE_NAMES[latest.emotive_state] : "?";

    int w = oled.getStrWidth(name);
    oled.drawStr((128 - w) / 2, 30, name);

    // Relay indicator
    oled.setFont(u8g2_font_5x7_tf);
    oled.drawStr(0, 58, relayState ? "Relay: ON" : "Relay: OFF");

    char pbuf[16];
    snprintf(pbuf, sizeof(pbuf), "%.0f W", latest.power);
    oled.drawStr(80, 58, pbuf);

    oled.sendBuffer();
}

// ── ESP-NOW receive callback ──────────────────────────────────────────────────
void onDataRecv(const esp_now_recv_info_t *info, const uint8_t *data, int len) {
    if (len != sizeof(EnergyPacket)) return;
    memcpy(&latest, data, sizeof(EnergyPacket));
    hasData = true;

    // Override emotive state based on server-synced thresholds
    if (latest.power > critThreshW) latest.emotive_state = 4;
}

// ── WiFi ──────────────────────────────────────────────────────────────────────
bool connectWiFi() {
    Serial.print("[Avatar] Connecting WiFi");
    WiFi.mode(WIFI_AP_STA);   // AP+STA so ESP-NOW channel stays fixed
    WiFi.begin(WIFI_SSID, WIFI_PASS);

    int tries = 0;
    while (WiFi.status() != WL_CONNECTED && tries < 20) {
        delay(500); Serial.print("."); tries++;
    }

    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("\n[Avatar] WiFi OK: " + WiFi.localIP().toString());
        return true;
    }
    Serial.println("\n[Avatar] WiFi FAILED — running offline");
    return false;
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────
void postReadings() {
    if (WiFi.status() != WL_CONNECTED || !hasData) return;

    HTTPClient http;
    String url = String(SERVER_URL) + "/api/readings";
    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("x-api-secret", API_SECRET);

    // Emotive state name for the server
    const char* stateName = (latest.emotive_state < 5)
        ? EMOTIVE_NAMES[latest.emotive_state] : "idle";

    JsonDocument doc;
    doc["voltage"]      = latest.voltage;
    doc["current"]      = latest.current;
    doc["power"]        = latest.power;
    doc["energy"]       = latest.energy;
    doc["frequency"]    = latest.frequency;
    doc["power_factor"] = latest.power_factor;
    doc["state"]        = stateName;
    doc["relay"]        = relayState;

    String body;
    serializeJson(doc, body);

    int code = http.POST(body);
    Serial.printf("[Avatar] POST /api/readings → %d\n", code);
    http.end();
}

void pollRelay() {
    if (WiFi.status() != WL_CONNECTED) return;

    HTTPClient http;
    String url = String(SERVER_URL) + "/api/relay";
    http.begin(url);
    http.addHeader("x-api-secret", API_SECRET);

    int code = http.GET();
    if (code == 200) {
        String payload = http.getString();
        JsonDocument doc;
        if (deserializeJson(doc, payload) == DeserializationError::Ok) {
            if (doc["pending"].as<bool>()) {
                relayState = doc["state"].as<bool>();
                Serial.printf("[Avatar] Relay cmd from dashboard: %s\n",
                    relayState ? "ON" : "OFF");
                // Note: actual relay switching is Sentry's job.
                // Avatar just records the desired state in its POST payload.
            }
        }
    }
    http.end();
}

void fetchConfig() {
    if (WiFi.status() != WL_CONNECTED) return;

    HTTPClient http;
    String url = String(SERVER_URL) + "/api/config";
    http.begin(url);
    http.addHeader("x-api-secret", API_SECRET);

    int code = http.GET();
    if (code == 200) {
        String payload = http.getString();
        JsonDocument doc;
        if (deserializeJson(doc, payload) == DeserializationError::Ok) {
            warnThreshW  = doc["warnThreshW"]         | warnThreshW;
            critThreshW  = doc["critThreshW"]         | critThreshW;
            frustMinutes = doc["frustMinutes"]        | frustMinutes;
            postInterval = doc["postIntervalSec"]     | postInterval;
            oledTimeout  = doc["oledTimeout"]         | oledTimeout;
            Serial.printf("[Avatar] Config synced — warn=%.0fW crit=%.0fW\n",
                warnThreshW, critThreshW);
        }
    }
    http.end();
}

// ── Setup ─────────────────────────────────────────────────────────────────────
void setup() {
    Serial.begin(115200);

    // OLED
    Wire.begin(21, 22);
    oled.begin();
    oled.setFont(u8g2_font_6x10_tf);
    oled.clearBuffer();
    oled.drawStr(20, 32, "E.T.H.E.R.");
    oled.sendBuffer();

    // NeoPixel
    ring.begin();
    setRingColor(0x00F5FF, 30);  // dim cyan at boot

    // Print own MAC
    WiFi.mode(WIFI_STA);
    Serial.print("[Avatar] MAC: ");
    Serial.println(WiFi.macAddress());

    connectWiFi();

    // ESP-NOW (must init after WiFi — shared radio)
    if (esp_now_init() != ESP_OK) {
        Serial.println("[Avatar] ESP-NOW init failed");
    } else {
        esp_now_register_recv_cb(onDataRecv);
        Serial.println("[Avatar] ESP-NOW listening.");
    }

    fetchConfig();
    lastConfig = millis();
    lastPost   = millis();
    lastRelay  = millis();
}

// ── Loop ──────────────────────────────────────────────────────────────────────
void loop() {
    uint32_t now = millis();

    // ── NeoPixel ─────────────────────────────────────────────────────────────
    uint8_t  st    = hasData ? latest.emotive_state : 0;
    uint32_t color = EMOTIVE_COLORS[st < 5 ? st : 0];
    breatheRing(color);

    // ── OLED mode cycling ─────────────────────────────────────────────────────
    if (now - oledLastSwap >= (uint32_t)oledTimeout * 1000) {
        oledMode    = (OledMode)((oledMode + 1) % MODE_COUNT);
        oledLastSwap = now;
    }

    switch (oledMode) {
        case MODE_EYES:     if (hasData) drawEyes(st);   break;
        case MODE_READINGS: if (hasData) drawReadings();  break;
        case MODE_STATE:    drawState();                  break;
        default: break;
    }

    // ── HTTP: POST readings every postInterval seconds ────────────────────────
    if (now - lastPost >= (uint32_t)postInterval * 1000) {
        lastPost = now;
        postReadings();
    }

    // ── HTTP: Poll relay commands every 5 seconds ─────────────────────────────
    if (now - lastRelay >= 5000) {
        lastRelay = now;
        pollRelay();
    }

    // ── HTTP: Re-sync config every 60 seconds ─────────────────────────────────
    if (now - lastConfig >= 60000) {
        lastConfig = now;
        fetchConfig();
    }

    delay(10);
}
