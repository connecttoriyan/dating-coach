// lib/api.ts
// -----------------------------------------------------------
// Tiny helper to point the frontend at the Python backend.
// Set NEXT_PUBLIC_API_BASE in .env.local
//   dev:  http://localhost:8000
//   prod: https://your-backend.onrender.com (or wherever)
// -----------------------------------------------------------
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export function apiUrl(path: string): string {
  // path should start with "/api/..."
  return `${API_BASE.replace(/\/$/, "")}${path}`;
}
