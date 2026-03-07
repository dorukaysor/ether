## **E.T.H.E.R.**
> **E**nergy **T**racking & **H**armonic **E**motive **R**eporter

---

### **Project Structure**

```text

```

---

### **:** Deployed to Netlify

Static Astro site with React islands. All data is fetched from the backend.

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

**Endpoints:**
| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/readings` | Latest reading / ESP32 posts data |
| GET | `/api/history` | Paginated history |
| POST | `/api/analysis` | Gemini AI energy analysis |
| GET/POST | `/api/relay` | Relay command (dashboard / ESP32 poll) |
| GET/POST | `/api/config` | Device config (dashboard / ESP32 poll) |
| GET | `/health` | Health check |

**Render env variables to set:** `TURSO_DB_URL`, `TURSO_DB_TOKEN`, `API_SECRET`, `GEMINI_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `CORS_ORIGIN`

---

### **Core:** ESP32 Firmware
Two separate PlatformIO projects for the Avatar and Sentry units. Both use ESP-NOW to communicate, so only the Avatar needs WiFi credentials.
- **Avatar**: Reads power data from Sentry, displays on OLED, sends to backend via WiFi.
- **Sentry**: Reads power data from PZEM-004T, controls relay, sends data to Avatar via ESP-NOW.

---

## **Future Scopes:** 
- [ ] User authentication to backend + dashboard
- [ ] Real-time updates to dashboard (WebSockets or Server-Sent Events)
- [ ] Detailed energy usage breakdowns and historical trends in dashboard
- [ ] Multi-device support (multiple Sentry units reporting to one Avatar)
- [ ] Mobile app for on-the-go monitoring and control
- [ ] Smart home integration (e.g. Home Assistant, IFTTT) for automation based on energy usage

---

## **License**
MIT License(LICENSE)