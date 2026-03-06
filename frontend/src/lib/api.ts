// Base URL for the Ether backend (Render).
// In development: http://localhost:3001
// In production: set PUBLIC_API_URL in Netlify environment variables
// e.g. https://ether-backend.onrender.com

export const API_BASE = (import.meta.env.PUBLIC_API_URL as string | undefined) ?? '';

// WebSocket base URL — derived automatically from API_BASE.
// http://  →  ws://
// https:// →  wss://
export const WS_BASE = API_BASE.replace(/^http/, 'ws');
