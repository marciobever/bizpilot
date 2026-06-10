export type Agent = {
  id: string;
  name: string;
  role: string;
  channel: "whatsapp" | "web" | "instagram";
  status: "active" | "training" | "offline";
  conversations: number;
  lastActive: string;
};

export type Conversation = {
  id: string;
  customerName: string;
  customerAvatar?: string;
  agentId: string;
  channel: "whatsapp" | "web" | "instagram";
  lastMessage: string;
  time: string;
  unread: boolean;
  status: "open" | "resolved" | "handoff";
};

export type Lead = {
  id: string;
  name: string;
  company: string;
  value: number;
  status: "new" | "qualified" | "negotiation" | "won" | "lost";
  agent: string;
};

export type Integration = {
  id: string;
  name: string;
  category: "messaging" | "crm" | "payment" | "database" | "api";
  status: "connected" | "disconnected";
  icon: string;
};
