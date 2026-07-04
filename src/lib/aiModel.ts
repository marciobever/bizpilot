// Modelo de chat único do BizPilot. Não há mais seleção de provedor: toda a
// stack (RAG, function calling, TTS, memória) roda no OpenAI. Todo agente é
// salvo com este modelo. Se mudar aqui, mude também a constante CHAT_MODEL no
// windmill/2_ai_processor.ts (script standalone, não importa deste arquivo).
export const CHAT_MODEL = 'gpt-5.4-mini';
