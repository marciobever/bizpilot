import { NextResponse } from 'next/server';

export async function findFullInstanceName(prefix: string): Promise<string> {
  if (!prefix) return '';
  const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
  const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) return prefix;

  try {
    const listRes = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances`, {
      headers: { 'apikey': EVOLUTION_API_KEY }
    });
    if (listRes.ok) {
      const data = await listRes.json();
      const items = Array.isArray(data) ? data : (data?.instances || data?.data || []);
      if (Array.isArray(items)) {
        for (const item of items) {
          const instName = item?.instanceName || item?.instance?.instanceName || item?.name;
          if (instName && typeof instName === 'string' && instName.toLowerCase().startsWith(prefix.toLowerCase())) {
            return instName;
          }
        }
      }
    }
  } catch (err) {
    console.error("Error fetching instances list to resolve suffix:", err);
  }

  return prefix;
}
