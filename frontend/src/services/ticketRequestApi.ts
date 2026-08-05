import type {
  ControllerSoftwareRequestPayload,
  PumpTestRigRequestPayload,
  TicketRequestMasterData,
  TicketRequestSubmissionResponse,
} from "@ticket-system/shared";

const TICKET_REQUEST_API_BASE = "/api/ticket-requests";

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${TICKET_REQUEST_API_BASE}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }

  return response.json() as Promise<T>;
}

export function fetchTicketRequestMasterData() {
  return requestJson<TicketRequestMasterData>("/master-data");
}

export function submitPumpTestRigRequest(payload: PumpTestRigRequestPayload) {
  return requestJson<TicketRequestSubmissionResponse>("/pump-test-rig", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function submitControllerSoftwareRequest(payload: ControllerSoftwareRequestPayload) {
  return requestJson<TicketRequestSubmissionResponse>("/controller-software", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
