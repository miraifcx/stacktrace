export interface CaseMessage {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: number;
}

export interface CaseDocument {
  id?: string;
  userId: string;
  createdAt: number;
  updatedAt: number;
  title: string;
  messages: CaseMessage[];
  summary?: string;
  tags?: string[];
  severity?: "low" | "medium" | "high" | "critical";
  resolutionSuccess?: boolean;
  archived?: boolean;
}
