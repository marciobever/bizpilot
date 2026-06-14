export type Agent = {
  id: string;
  user_id: string;
  name: string;
  type: string;
  system_prompt: string | null;
  status: 'online' | 'offline' | 'paused';
  config: Record<string, any> | null;
  created_at: string;
  updated_at: string;
};

export type Integration = {
  id: string;
  user_id: string;
  provider: string;
  name: string;
  status: 'connected' | 'disconnected' | 'error';
  config: any;
  created_at: string;
  updated_at: string;
};

export type Lead = {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  status: string;
  score: number;
  tags: string[];
  created_at: string;
  updated_at: string;
};

export type Conversation = {
  id: string;
  user_id: string;
  agent_id: string | null;
  lead_id: string;
  channel: string;
  status: string;
  last_message_at: string;
  created_at: string;
  lead?: Lead;
  agent?: Agent;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_type: 'lead' | 'agent' | 'human';
  content: string;
  media_url?: string | null;
  media_type?: 'image' | 'document' | 'audio' | null;
  media_name?: string | null;
  created_at: string;
};
