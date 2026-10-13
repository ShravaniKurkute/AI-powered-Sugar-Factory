export type FarmerRecord = {
  id: number;
  name: string;
  village: string;
  sugarcane_tons: number;
  payment_pending: number;
  amount_paid: number;
};

export type FarmerSummary = {
  totalFarmers: number;
  totalSugarcaneTons: number;
  totalPendingPayments: number;
  totalAmountPaid: number;
};

export type FarmerDashboardResponse = {
  source: string;
  farmers: FarmerRecord[];
  summary: FarmerSummary;
  generatedAt: string;
};

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message =
      typeof errorBody?.error === "string"
        ? errorBody.error
        : "Request failed. Please try again.";
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export async function fetchFarmers(): Promise<FarmerDashboardResponse> {
  const response = await fetch("/api/farmers");
  return handleResponse<FarmerDashboardResponse>(response);
}

export async function sendAssistantQuestion(question: string): Promise<string> {
  const response = await fetch("/api/assistant", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ question }),
  });

  const payload = await handleResponse<{ answer?: string; error?: string }>(response);

  if (payload.answer) {
    return payload.answer;
  }

  throw new Error(payload.error ?? "No answer returned by the assistant.");
}
