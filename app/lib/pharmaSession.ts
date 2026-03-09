// /lib/pharmaSession.ts

export function getPharmaSessionId(): string | null {
  if (typeof window === "undefined") return null;

  let sessionId = localStorage.getItem("pharmacy_session_id");

  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem("pharmacy_session_id", sessionId);
  }

  return sessionId;
}

export function clearPharmaSessionId() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("pharmacy_session_id");
}