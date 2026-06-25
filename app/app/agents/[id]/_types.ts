export type AgentTool = {
  id: string;
  name: string;
  description: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  parameters: Record<string, string>;
  required_params: string[];
};

export type MediaFile = {
  id: string;
  name: string;
  description: string;
  url: string;
};

export type KnowledgeEntry = {
  id: string;
  title: string;
  source_type: string;
  source_url?: string;
  chunk_count: number;
  created_at: string;
};
