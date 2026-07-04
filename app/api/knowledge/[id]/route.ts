import { NextRequest, NextResponse } from 'next/server';
import { requireUser, getServiceSupabase, userOwnsAgent } from '@/lib/api-auth';

// DELETE /api/knowledge/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const supabase = getServiceSupabase();

  // Confere que o documento pertence a um agente do usuário logado.
  const { data: doc } = await supabase
    .from('knowledge_base')
    .select('agent_id')
    .eq('id', id)
    .maybeSingle();

  if (!doc || !(await userOwnsAgent((doc as any).agent_id, auth.user.id))) {
    return NextResponse.json({ error: 'Documento não encontrado.' }, { status: 404 });
  }

  const { error } = await supabase.from('knowledge_base').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
