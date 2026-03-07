## AURA
### *Ambient Unconscious Stress Detector for Hospital Rooms*

---

### 📌 Concept
Most hospital monitoring systems require patients to **wear something** — a clip, a patch, a band. AURA throws that idea out entirely. It monitors the **room itself** — treating the environment as a proxy for the patient's physiological and emotional state. The idea is rooted in the fact that a stressed human body subtly changes its environment: breathing rate increases (more CO₂), micro-movements on the mattress change, voice tone shifts, and skin radiates slightly more heat. AURA captures all of these **passively and simultaneously** and builds a composite **Stress Score** for the room.

---

### 🔥 The Problem
- **~60% of hospitalized patients** experience anxiety and stress that goes undetected because nurses are overwhelmed
- Untreated stress in patients **delays healing, increases BP, disrupts sleep**, and worsens outcomes
- Existing vitals monitors catch physical deterioration — but **not psychological or early-stage stress**
- Patients — especially elderly, non-verbal, or post-surgery — **cannot communicate distress**
- There is **no passive, contactless, multi-signal stress scoring system** for hospital rooms anywhere in the world

---

### ✅ The Solution — How AURA Works
```
Room CO₂ rises (patient breathing fast)   ──┐
Mattress micro-vibrations increase        ──┤──→ ESP32 fuses signals
IR skin temp rises slightly               ──┤    → Stress Score computed
Voice tone shifts (agitated pattern)      ──┘    → Alert sent to nurse app
                                                 → Logged to cloud dashboard
```
- ESP32 runs a **weighted scoring algorithm** — no single signal triggers an alert, reducing false positives
- Over 24–48 hours, it builds a **personal baseline** per patient, so deviations are patient-specific
- Nurses get a **silent vibration alert** on a wristband or phone — no loud alarms that stress other patients

---

### 🔧 Components & Cost

| Component | Purpose | Price (₹) |
|---|---|---|
| ESP32 Dev Board | Brain + Wi-Fi | ₹350 |
| MQ135 Gas Sensor | CO₂ / Air quality | ₹200 |
| Piezo Vibration Sensor | Mattress breathing detection | ₹40 |
| MLX90614 IR Temp Sensor | Contactless skin temp | ₹700 |
| INMP441 MEMS Microphone | Voice tone analysis | ₹250 |
| OLED 0.96" Display | Local room status | ₹150 |
| DHT22 Temp/Humidity | Room ambient monitoring | ₹180 |
| Li-Po Battery + Charging module | Power | ₹300 |
| PCB / Breadboard + Wires | Assembly | ₹150 |
| Enclosure/Box | Housing unit | ₹100 |
| **TOTAL** | | **≈ ₹2,420** |

**Difficulty:** ⭐⭐⭐ Medium
**Timeline:** 3–4 weeks
**Innovation Score:** 🔥🔥🔥🔥🔥

---
---

## 🟠 PROJECT 2 — VEIN
### *Voice-Based Early Illness Notification*

---

### 📌 Concept
Your voice is a **biological fingerprint of your health**. When you're sick, getting depressed, developing Parkinson's, or fighting an infection — your voice changes in ways that are **measurable but invisible to the human ear**. VEIN is a bedside device that asks the patient to speak one sentence each morning, extracts hidden acoustic biomarkers from that voice, and flags if the pattern matches known illness signatures. It's like a **doctor's stethoscope — but for your voice, running 24/7, on a ₹400 chip.**

---

### 🔥 The Problem
- Voice biomarker research is **published and validated** in top journals — but exists only in expensive lab setups or smartphone apps needing internet
- **Parkinson's** can be detected 5+ years early through voice tremors — but isn't screened for
- **Respiratory infections** change breathing rhythm and voice breathiness **2–3 days before fever** — but no one catches this
- **Depression** measurably flattens voice pitch variation — undetected in most clinical settings
- There is **no dedicated ESP32-edge voice biomarker device** for hospitals or home care

---

### ✅ The Solution — How VEIN Works
```
Patient says: "Good morning, I feel okay" (same sentence daily)
                        ↓
INMP441 mic captures audio → ESP32 extracts:
   → Pitch mean & variance
   → Tremor frequency
   → Speech rate
   → Breathiness (zero-crossing rate)
   → Pause patterns
                        ↓
Features sent to cloud (Firebase / AWS)
                        ↓
ML model compares to baseline & illness profiles
                        ↓
Output: "⚠️ Respiratory stress pattern detected in Patient Room 4"
```
- **No full audio stored** — only numerical features (privacy-safe)
- Learns each patient's **personal vocal baseline** over 3 days
- Flags **deviation** — not just absolute thresholds

---

### 🔧 Components & Cost

| Component | Purpose | Price (₹) |
|---|---|---|
| ESP32 Dev Board | Brain + Wi-Fi | ₹350 |
| INMP441 MEMS Mic (I2S) | High-quality voice capture | ₹250 |
| OLED Display | Status + prompt display | ₹150 |
| Push Button | "Speak now" trigger | ₹20 |
| LED Ring / indicator | Recording status | ₹80 |
| Li-Po Battery + Module | Power | ₹300 |
| SD Card Module + Card | Local audio buffer | ₹180 |
| 3D printed / plastic casing | Bedside unit housing | ₹150 |
| **TOTAL** | | **≈ ₹1,480** |

> ☁️ Cloud ML model runs on **Google Colab (free)** or **Firebase (free tier)** — no additional hardware cost

**Difficulty:** ⭐⭐⭐⭐ Hard (ML model training required)
**Timeline:** 5–6 weeks
**Innovation Score:** 🔥🔥🔥🔥🔥

---
---

## 🟡 PROJECT 3 — PULSE MIRROR
### *Contactless Heart Rate via ESP32-CAM + rPPG*

---

### 📌 Concept
**rPPG (Remote Photoplethysmography)** is the science of detecting your heartbeat from your face using a camera. Every time your heart beats, blood rushes through the tiny capillaries in your skin — causing a **microscopic, imperceptible color shift** in your face. A camera can see this. PULSE MIRROR uses the **ESP32-CAM** (a ₹600 module) to detect heart rate, breathing rate, and stress level from a patient's face — **completely contactless, completely passive, no touching required.**

---

### 🔥 The Problem
- **Burn victims, premature babies, dementia patients, and post-surgery patients** cannot wear finger clips or chest bands reliably
- Pulse oximeter clips cause **pressure sores** in long-term use
- Hospital staff spend significant time **reattaching dislodged sensors**
- rPPG technology exists in **research papers and expensive equipment** — but no one has deployed it on a cheap ESP32-CAM for open hospital use
- There is **zero affordable, open-source, deployable rPPG bedside monitor** in existence

---

### ✅ The Solution — How PULSE MIRROR Works
```
ESP32-CAM captures patient's face (30fps, no flash)
                        ↓
ESP32 extracts Region of Interest (forehead/cheek)
                        ↓
Tracks R/G/B channel intensity per frame
                        ↓
Applies bandpass filter (0.7–4 Hz = 42–240 BPM range)
                        ↓
FFT → dominant frequency = Heart Rate
Breathing detected via slower signal envelope (~0.1–0.5 Hz)
                        ↓
Sends HR + RR to Wi-Fi dashboard
Alerts if HR < 50 or > 130 BPM
```
- Works in **normal room lighting** (no IR needed for rPPG)
- **No patient interaction** — they just lie in bed
- Privacy-safe: **no video stored**, only computed numbers

---

### 🔧 Components & Cost

| Component | Purpose | Price (₹) |
|---|---|---|
| ESP32-CAM (OV2640) | Camera + Brain + Wi-Fi | ₹600 |
| FTDI USB-Serial Adapter | Programming the ESP32-CAM | ₹200 |
| Adjustable Camera Mount | Positioning at bedside | ₹120 |
| LED Strip (warm white) | Consistent lighting | ₹150 |
| Small OLED Display | Live HR readout | ₹150 |
| Li-Po Battery + Module | Power | ₹300 |
| Enclosure | Housing | ₹120 |
| **TOTAL** | | **≈ ₹1,640** |

**Difficulty:** ⭐⭐⭐⭐ Hard (signal processing + image handling)
**Timeline:** 4–5 weeks
**Innovation Score:** 🔥🔥🔥🔥

---
---

## 🟢 PROJECT 4 — CHRONO-MED
### *Circadian Rhythm-Aware Smart IV Drip Controller*

---

### 📌 Concept
**Chronotherapy** is the Nobel Prize-backed science of administering medicine in sync with your body clock. Your liver, kidneys, heart, and immune system all operate on a **24-hour biological rhythm** — meaning drugs are absorbed better, work harder, and have fewer side effects **at specific times of day**. For example, blood pressure meds taken at night are **3× more effective** than in the morning for some patients. CHRONO-MED is the world's first attempt to bring this science to the bedside — using an ESP32 wristband to track the patient's personal circadian phase and **automatically adjust IV drip timing and flow rate** accordingly.

---

### 🔥 The Problem
- Hospitals administer medicine on **fixed clock schedules** (8AM / 2PM / 8PM) — ignoring individual biology
- **Chronotherapy is proven** to increase chemotherapy effectiveness by up to 50%, reduce toxicity in cardiac drugs, and improve diabetic drug outcomes — but is **never implemented** in real-time, automatically
- IV drip rates are set manually by nurses and rarely adjusted for biological timing
- There is **no wearable-linked, circadian-aware IV controller** in existence — not even in expensive hospital systems

---

### ✅ The Solution — How CHRONO-MED Works
```
ESP32 Wristband tracks:
   → Core body temp rhythm (peaks ~6PM in most humans)
   → HRV (Heart Rate Variability — circadian marker)
   → Activity/sleep via accelerometer
                        ↓
Builds patient's personal Circadian Phase Model
                        ↓
Doctor inputs: Drug name + Total dose + Time window
                        ↓
CHRONO-MED calculates: Optimal drip timing & flow rate
                        ↓
ESP32 controls stepper motor on IV drip clamp
   → Opens/closes drip at biologically optimal moments
   → Adjusts flow rate (drops/min) based on absorption window
                        ↓
Logs everything → Cloud dashboard for doctor review
```

---

### 🔧 Components & Cost

| Component | Purpose | Price (₹) |
|---|---|---|
| ESP32 Dev Board | Brain + Wi-Fi | ₹350 |
| MAX30102 | HRV + Heart Rate tracking | ₹250 |
| MLX90614 IR Temp Sensor | Core body temp (wrist) | ₹700 |
| MPU6050 Accelerometer | Sleep/activity tracking | ₹120 |
| 28BYJ-48 Stepper Motor | IV drip flow control | ₹200 |
| ULN2003 Motor Driver | Stepper motor driver | ₹60 |
| DS3231 RTC Module | Precise time-keeping | ₹180 |
| OLED Display | Status display | ₹150 |
| Li-Po Battery + Module | Wristband power | ₹300 |
| Flexible wristband enclosure | Wearable housing | ₹200 |
| IV Drip Clamp (modified) | Flow rate mechanical control | ₹150 |
| **TOTAL** | | **≈ ₹2,660** |

**Difficulty:** ⭐⭐⭐⭐⭐ Very Hard
**Timeline:** 6–8 weeks
**Innovation Score:** 🔥🔥🔥🔥🔥

---
---

## 🔵 PROJECT 5 — SWEATCODE
### *Sweat-Based Early Disease Fingerprinting*

---

### 📌 Concept
Your sweat is not just water and salt. It contains **glucose, lactate, uric acid, cortisol, pH indicators, sodium, potassium** — essentially a diluted version of your blood chemistry. SWEATCODE is a flexible wearable patch with **ion-selective electrodes** that reads these markers continuously and sends them to an ESP32, which builds a **SweatCode** — a metabolic fingerprint. Changes in this fingerprint over days can flag early signs of **diabetes, kidney stress, dehydration disorders, and metabolic diseases** — without a single needle prick.

---

### 🔥 The Problem
- **Blood tests are invasive**, lab-dependent, and give only a snapshot
- Sweat analysis research exists in **Stanford, MIT, and Nature journals** — but has **never been packaged as an affordable, open-source DIY device**
- Early metabolic disease detection could save millions in India where **diabetes affects 77 million people** and is often caught late
- Current glucose monitors are **expensive, require calibration blood pricks**, and don't monitor other metabolic markers simultaneously
- There is **no affordable Indian-made sweat fingerprinting wearable** for preventive health

---

### ✅ The Solution — How SWEATCODE Works
```
Flexible patch worn on forearm/wrist:
   → pH electrode measures sweat acidity
   → Na⁺ ISE measures sodium (hydration marker)
   → K⁺ ISE measures potassium (kidney/heart marker)
   → Glucose enzyme electrode measures sweat glucose
   → Temp sensor corrects for temperature drift
                        ↓
ESP32 reads all analog values via ADC
                        ↓
Normalizes + fuses readings → "SweatCode" vector
                        ↓
Compares to historical baseline (3-day learning)
                        ↓
Flags anomalies:
   "⚠️ Sweat glucose trending high — consult doctor"
   "⚠️ Na⁺ critically low — dehydration risk"
                        ↓
BLE → Phone app dashboard + cloud log
```

---

### 🔧 Components & Cost

| Component | Purpose | Price (₹) |
|---|---|---|
| ESP32 Dev Board | Brain + BLE + Wi-Fi | ₹350 |
| pH Sensor + Electrode | Sweat acidity | ₹650 |
| Na⁺ Ion Selective Electrode | Sodium / hydration | ₹800 |
| K⁺ Ion Selective Electrode | Potassium / kidney marker | ₹800 |
| Glucose Enzyme Electrode | Sweat glucose | ₹1,200 |
| MLX90614 / NTC Thermistor | Temperature compensation | ₹200 |
| ADS1115 16-bit ADC | High-res analog reading | ₹280 |
| Flexible PCB / Kapton tape base | Wearable patch substrate | ₹400 |
| Li-Po Battery (small) | Patch power | ₹250 |
| BLE Antenna + Enclosure | Connectivity | ₹150 |
| **TOTAL** | | **≈ ₹5,080** |

> ⚠️ Ion-selective electrodes are research-grade components — available at **Robu.in, Amazon India, or AliExpress India delivery**

**Difficulty:** ⭐⭐⭐⭐ Hard
**Timeline:** 5–7 weeks
**Innovation Score:** 🔥🔥🔥🔥🔥

---
---

## 📊 Master Comparison Table

| | 🔴 AURA | 🟠 VEIN | 🟡 PULSE MIRROR | 🟢 CHRONO-MED | 🔵 SWEATCODE |
|---|---|---|---|---|---|
| **Cost (₹)** | ₹2,420 | ₹1,480 | ₹1,640 | ₹2,660 | ₹5,080 |
| **Difficulty** | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Build Time** | 3–4 wks | 5–6 wks | 4–5 wks | 6–8 wks | 5–7 wks |
| **ETHER Fit** | ✅✅✅ | ✅✅ | ✅✅✅ | ✅✅ | ✅✅ |
| **Innovation** | 🔥🔥🔥🔥🔥 | 🔥🔥🔥🔥🔥 | 🔥🔥🔥🔥 | 🔥🔥🔥🔥🔥 | 🔥🔥🔥🔥🔥 |
| **Wearable?** | ❌ Room unit | ❌ Bedside unit | ❌ Ceiling/wall | ✅ Wristband | ✅ Arm patch |
| **Contact-free?** | ✅ Fully | ✅ Fully | ✅ Fully | ❌ Worn | ❌ Worn |
| **Publication Potential** | 🏆 High | 🏆 Very High | 🏆 High | 🏆 Very High | 🏆 High |