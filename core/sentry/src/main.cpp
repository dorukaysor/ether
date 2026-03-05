// ─────────────────────────────────────────────────────────────────────────────
// E.T.H.E.R.  —  SENTRY UNIT
// ESP32 #1 | PZEM-004T v3.0 | 5V Relay | Hi-Link PSU
//
// Responsibilities:
//   1. Read AC mains data every 500 ms via PZEM-004T (Serial2)
//   2. Enforce safety relay: cut power when Watts > 2500
//   3. Broadcast a packed struct to Avatar via ESP-NOW (no WiFi AP needed)
//
// Wiring:
//   PZEM TX  → GPIO16 (RX2)
//   PZEM RX  → GPIO17 (TX2)
//   Relay IN → GPIO26  (HIGH = relay ON / load energised)
//   Status   → GPIO2   (built-in LED, blinks on each send)
// ─────────────────────────────────────────────────────────────────────────────

#include <Arduino.h>
#include <esp_now.h>
#include <WiFi.h>
#include <PZEM004Tv30.h>

// ── Pin definitions ───────────────────────────────────────────────────────────
#define RELAY_PIN   26   // HIGH = load ON
#define LED_PIN      2   // built-in LED

// ── PZEM on Serial2 (RX=16, TX=17) ──────────────────────────────────────────
PZEM004Tv30 pzem(Serial2, 16, 17);

// ── Avatar MAC address — change to match your Avatar ESP32 ──────────────────
// Run this sketch first with "Print own MAC" to find it, then paste here.
uint8_t avatarMac[6] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF}; // ← update me

// ── Shared data packet (must match Avatar's definition exactly) ──────────────
#pragma pack(push, 1)
struct EnergyPacket {
    float    voltage;       // V
    float    current;       // A
    float    power;         // W
    float    energy;        // kWh
    float    frequency;     // Hz
    float    power_factor;
    bool     relay_state;   // true = ON
    uint8_t  emotive_state; // 0=Idle 1=Happy 2=Dizzy 3=Frustrated 4=Angry
};
#pragma pack(pop)

// ── State ─────────────────────────────────────────────────────────────────────
static bool       relayOn          = true;
static uint32_t   frustratedStart  = 0;   // millis when >1000W started
static bool       overloadTracking = false;

esp_now_peer_info_t peerInfo = {};

// ── Emotive state logic ───────────────────────────────────────────────────────
uint8_t calcEmotiveState(float watts, float lastWatts) {
    if (watts > 2500.0f)  return 4;  // Angry  — relay will cut

    if (watts > 1000.0f) {
        if (!overloadTracking) {
            overloadTracking = true;
            frustratedStart  = millis();
        }
        uint32_t elapsed = (millis() - frustratedStart) / 1000;
        if (elapsed >= 15 * 60) return 3;  // Frustrated  >15 min
        return 0;                           // still Idle (counting up)
    }

    overloadTracking = false;

    float delta = watts - lastWatts;
    if (delta < -50.0f) return 1;   // Happy  — significant drop
    if (fabsf(delta) > 80.0f) return 2; // Dizzy  — spike/fluctuation
    return 0;                           // Idle   — 50-300W normal
}

// ── ESP-NOW send callback (optional debug) ───────────────────────────────────
void onDataSent(const uint8_t *mac, esp_now_send_status_t status) {
    // Blink LED to indicate transmission
    digitalWrite(LED_PIN, HIGH);
    delay(20);
    digitalWrite(LED_PIN, LOW);
}

// ── Setup ─────────────────────────────────────────────────────────────────────
void setup() {
    Serial.begin(115200);
    pinMode(RELAY_PIN, OUTPUT);
    pinMode(LED_PIN, OUTPUT);
    digitalWrite(RELAY_PIN, HIGH);   // relay ON at boot

    // Print own MAC so you can paste it into Avatar's SENTRY_MAC
    WiFi.mode(WIFI_STA);
    Serial.print("[Sentry] MAC: ");
    Serial.println(WiFi.macAddress());

    // Init ESP-NOW
    if (esp_now_init() != ESP_OK) {
        Serial.println("[Sentry] ESP-NOW init failed");
        while (true) delay(1000);
    }
    esp_now_register_send_cb(onDataSent);

    // Register Avatar as peer
    memcpy(peerInfo.peer_addr, avatarMac, 6);
    peerInfo.channel = 0;
    peerInfo.encrypt = false;
    if (esp_now_add_peer(&peerInfo) != ESP_OK) {
        Serial.println("[Sentry] Failed to add Avatar peer");
    }

    Serial.println("[Sentry] Ready.");
}

// ── Loop ──────────────────────────────────────────────────────────────────────
void loop() {
    static float    lastWatts  = 0.0f;
    static uint32_t lastSend   = 0;

    if (millis() - lastSend < 500) return;
    lastSend = millis();

    // Read PZEM
    float v  = pzem.voltage();
    float a  = pzem.current();
    float w  = pzem.power();
    float e  = pzem.energy();
    float hz = pzem.frequency();
    float pf = pzem.pf();

    // PZEM returns NaN when no load / comm error — substitute zeros
    if (isnan(v))  v  = 0;
    if (isnan(a))  a  = 0;
    if (isnan(w))  w  = 0;
    if (isnan(e))  e  = 0;
    if (isnan(hz)) hz = 0;
    if (isnan(pf)) pf = 0;

    // Safety relay enforcement
    if (w > 2500.0f && relayOn) {
        relayOn = false;
        digitalWrite(RELAY_PIN, LOW);
        Serial.printf("[Sentry] RELAY CUT — %.1fW exceeds 2500W\n", w);
    } else if (w <= 2500.0f && !relayOn) {
        // Only re-enable relay when cleared (manual reset / power drops)
        relayOn = true;
        digitalWrite(RELAY_PIN, HIGH);
        Serial.println("[Sentry] Relay restored.");
    }

    uint8_t state = calcEmotiveState(w, lastWatts);
    lastWatts = w;

    EnergyPacket pkt = {v, a, w, e, hz, pf, relayOn, state};

    esp_err_t result = esp_now_send(avatarMac, (uint8_t *)&pkt, sizeof(pkt));

    Serial.printf("[Sentry] V=%.1f A=%.3f W=%.1f Hz=%.2f PF=%.3f relay=%s state=%d TX=%s\n",
        v, a, w, hz, pf,
        relayOn ? "ON" : "OFF",
        state,
        result == ESP_OK ? "OK" : "FAIL"
    );
}
