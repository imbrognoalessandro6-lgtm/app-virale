// Supabase Edge Function: legge una foto di bolletta / multa / lettera e restituisce
// tipo, importo, scadenza e una spiegazione semplice, usando Claude (vision + structured outputs).
//
// Segreti richiesti (supabase secrets set ...): ANTHROPIC_API_KEY
// SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY sono forniti automaticamente.

import Anthropic from 'npm:@anthropic-ai/sdk';
import { createClient } from 'npm:@supabase/supabase-js@2';

const FREE_SCANS_PER_MONTH = 3; // deve coincidere con src/lib/config.ts
const MAX_IMAGE_BASE64 = 7_000_000; // ~5 MB

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['kind', 'title', 'issuer', 'amount', 'dueDate', 'explanation', 'todo', 'readable'],
  properties: {
    kind: { type: 'string', enum: ['bolletta', 'auto', 'documento', 'fisco', 'multa', 'altro'] },
    title: { type: 'string', description: 'Titolo breve, es. "Bolletta luce settembre-ottobre"' },
    issuer: { type: 'string', description: 'Chi ha emesso il documento, es. "Enel Energia", "Comune di Milano". Vuoto se non chiaro.' },
    amount: { anyOf: [{ type: 'number' }, { type: 'null' }], description: 'Importo da pagare in euro, null se assente' },
    dueDate: { anyOf: [{ type: 'string' }, { type: 'null' }], description: 'Scadenza in formato YYYY-MM-DD, null se assente' },
    explanation: { type: 'string', description: 'Spiegazione semplice in 1-3 frasi di cosa dice il documento' },
    todo: { type: 'array', items: { type: 'string' }, description: 'Da 1 a 4 passi concreti da fare, in ordine' },
    readable: { type: 'boolean', description: 'false se la foto è illeggibile o non è un documento' },
  },
} as const;

const SYSTEM = `Sei l'assistente di "Casa in Ordine", un'app italiana che aiuta le famiglie a non dimenticare scadenze e pagamenti.
Ricevi la foto di un documento italiano: bolletta (luce, gas, acqua, internet, TARI), avviso di pagamento, multa/verbale,
bollo auto, revisione, assicurazione RC, F24, avviso dell'Agenzia delle Entrate o INPS, documento d'identità in scadenza, ecc.

Estrai i dati e spiegali come a una persona che non conosce la burocrazia:
- explanation: italiano semplice, tono rassicurante, nessun gergo. Se ci sono sconti per pagamento rapido
  (es. multa ridotta del 30% entro 5 giorni) o rischi di more, dillo chiaramente.
- todo: passi pratici (es. "Paga con PagoPA dall'app della banca usando il codice avviso"), al massimo 4.
- kind: "documento" per carta d'identità/passaporto/patente; "auto" per bollo, revisione, RC auto; "fisco" per F24,
  tasse, avvisi fiscali; "multa" per verbali; "bolletta" per utenze; altrimenti "altro".
- dueDate: la data entro cui pagare o agire. Per un documento d'identità è la data di scadenza del documento.
- amount: totale da pagare (non le singole voci). null se non c'è un importo.
Non inventare dati che non vedi: se un campo non è leggibile usa null o stringa vuota. Non dare consulenza legale.`;

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Metodo non consentito' }, 405);

  // 1. Utente autenticato (anche anonimo) e suo gruppo.
  const auth = req.headers.get('Authorization') ?? '';
  const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: auth } },
  });
  const { data: userData } = await userClient.auth.getUser();
  const user = userData.user;
  if (!user) return json({ error: 'Non autenticato' }, 401);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: member } = await admin
    .from('members')
    .select('group_id, groups(premium_until)')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!member) return json({ error: 'Nessuna famiglia' }, 403);

  // 2. Quota gratuita mensile per famiglia.
  const g = member.groups as unknown as { premium_until: string | null } | null;
  const premium = Boolean(g?.premium_until && new Date(g.premium_until) > new Date());
  if (!premium) {
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
    const { count } = await admin
      .from('scans')
      .select('id', { count: 'exact', head: true })
      .eq('group_id', member.group_id)
      .gte('created_at', monthStart);
    if ((count ?? 0) >= FREE_SCANS_PER_MONTH) return json({ error: 'Scansioni gratuite esaurite' }, 402);
  }

  // 3. Immagine.
  let image: string;
  try {
    ({ image } = await req.json());
  } catch {
    return json({ error: 'Richiesta non valida' }, 400);
  }
  if (typeof image !== 'string' || image.length < 100) return json({ error: 'Immagine mancante' }, 400);
  if (image.length > MAX_IMAGE_BASE64) return json({ error: 'Immagine troppo grande' }, 413);

  // 4. Lettura con Claude.
  const today = new Date().toISOString().slice(0, 10);
  let response;
  try {
    response = await anthropic.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      // Se un filtro di sicurezza rifiuta per errore, l'API riprova da sola con il modello consigliato.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCHEMA } },
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image } },
            { type: 'text', text: `Oggi è il ${today}. Leggi questo documento.` },
          ],
        },
      ],
    });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return json({ error: 'Troppe richieste, riprova tra un minuto.' }, 429);
    if (e instanceof Anthropic.BadRequestError) return json({ error: 'Immagine non valida.' }, 400);
    console.error('Errore Claude', e);
    return json({ error: 'Servizio momentaneamente non disponibile.' }, 502);
  }

  if (response.stop_reason === 'refusal') {
    return json({ error: 'Questo documento non può essere analizzato.' }, 422);
  }
  const text = response.content.find((b) => b.type === 'text');
  if (!text || text.type !== 'text') return json({ error: 'Risposta vuota' }, 502);

  let result: Record<string, unknown>;
  try {
    result = JSON.parse(text.text);
  } catch {
    return json({ error: 'Risposta non valida' }, 502);
  }

  // 5. Conta la scansione solo se è andata a buon fine.
  await admin.from('scans').insert({ group_id: member.group_id, user_id: user.id });
  return json(result);
});
