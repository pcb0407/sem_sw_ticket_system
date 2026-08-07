import type {
  ControllerSoftwareRequestPayload,
  CreateMasterDataOptionInput,
  MasterDataOption,
  PumpTestRigRequestPayload,
  TicketRequestMasterData,
  TicketRequestSubmissionResponse,
  UpdateMasterDataOptionInput,
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

// --- Settings API ---

export function fetchMasterDataOptionsByGroup(group: string) {
  return requestJson<MasterDataOption[]>(`/settings/options?group=${encodeURIComponent(group)}`);
}

export function createMasterDataOption(input: CreateMasterDataOptionInput) {
  return requestJson<MasterDataOption>("/settings/options", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateMasterDataOption(id: string, input: UpdateMasterDataOptionInput) {
  return requestJson<MasterDataOption>(`/settings/options/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function deleteMasterDataOption(id: string) {
  return requestJson<{ id: string }>(`/settings/options/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export function toggleMasterDataOptionActive(id: string) {
  return requestJson<MasterDataOption>(`/settings/options/${encodeURIComponent(id)}/toggle`, {
    method: "PATCH",
  });
}
