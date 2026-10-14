// Supabase Edge Function: riceve gli eventi di RevenueCat e attiva/disattiva Premium per l'intera famiglia.
// In RevenueCat: Integrations → Webhooks → URL = https://<progetto>.supabase.co/functions/v1/revenuecat-webhook
// e "Authorization header" = il valore del segreto REVENUECAT_WEBHOOK_SECRET.
// Deploy con: supabase functions deploy revenuecat-webhook --no-verify-jwt

import { createClient } from 'npm:@supabase/supabase-js@2';

const ACTIVE_EVENTS = new Set(['INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION', 'PRODUCT_CHANGE', 'NON_RENEWING_PURCHASE']);

Deno.serve(async (req) => {
  if (req.headers.get('Authorization') !== Deno.env.get('REVENUECAT_WEBHOOK_SECRET')) {
    return new Response('unauthorized', { status: 401 });
  }
  const { event } = await req.json();
  if (!event?.app_user_id) return new Response('ignored');

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: member } = await admin.from('members').select('group_id').eq('user_id', event.app_user_id).maybeSingle();
  if (!member) return new Response('no member');

  let premiumUntil: string | null | undefined;
  if (ACTIVE_EVENTS.has(event.type)) {
    premiumUntil = event.expiration_at_ms ? new Date(event.expiration_at_ms).toISOString() : '2999-12-31T00:00:00Z';
  } else if (event.type === 'EXPIRATION') {
    premiumUntil = null;
  }
  // CANCELLATION: l'abbonamento resta valido fino alla scadenza già salvata, non serve fare nulla.

  if (premiumUntil !== undefined) {
    const { error } = await admin.from('groups').update({ premium_until: premiumUntil }).eq('id', member.group_id);
    if (error) return new Response(error.message, { status: 500 });
  }
  return new Response('ok');
});
