import { NextResponse } from 'next/server';
import { findFullInstanceName } from '../../utils';

export async function DELETE(req: Request, context: any) {
  try {
    const { instanceName } = await context.params;
    const resolvedInstanceName = await findFullInstanceName(instanceName);
    const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
    const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;

    await fetch(`${EVOLUTION_API_URL}/instance/logout/${resolvedInstanceName}`, {
      method: 'DELETE',
      headers: { 'apikey': EVOLUTION_API_KEY || '' }
    });

    await fetch(`${EVOLUTION_API_URL}/instance/delete/${resolvedInstanceName}`, {
      method: 'DELETE',
      headers: { 'apikey': EVOLUTION_API_KEY || '' }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
