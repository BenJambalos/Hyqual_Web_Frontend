import { api } from "../api/client";

export async function logAuditEvent({ type, action, detail }) {
  try {
    await api.logAudit({ type, action, detail });
  } catch (error) {
    console.error("Unable to write audit log:", error);
  }
}
