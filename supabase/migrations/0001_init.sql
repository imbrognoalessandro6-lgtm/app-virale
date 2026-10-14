-- Schema di "Famiglia": cassa condivisa + scadenze.
-- Ogni utente (anche anonimo) appartiene a un solo gruppo familiare.
-- Tutte le tabelle sono protette da Row Level Security: si vedono solo i dati del proprio gruppo.

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  invite_code text not null unique,
  goal_name text,
  goal_amount numeric(12, 2) check (goal_amount > 0),
  goal_date date,
  -- Impostato solo dal webhook di RevenueCat: un abbonamento vale per tutta la famiglia.
  premium_until timestamptz,
  created_at timestamptz not null default now()
);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  -- null = profilo senza account (es. un figlio) oppure membro che ha lasciato il gruppo
  user_id uuid unique references auth.users (id) on delete set null,
  name text not null check (char_length(name) between 1 and 40),
  color text not null default '#2a78d6',
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  type text not null check (type in ('entrata', 'uscita')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  member_id uuid not null references public.members (id),
  category_id uuid not null references public.categories (id),
  type text not null check (type in ('entrata', 'uscita')),
  amount numeric(12, 2) not null check (amount > 0),
  date date not null,
  note text not null default '',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index transactions_group_date on public.transactions (group_id, date desc);

create table public.deadlines (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  kind text not null check (kind in ('bolletta', 'auto', 'documento', 'fisco', 'multa', 'altro')),
  title text not null check (char_length(title) between 1 and 120),
  amount numeric(12, 2),
  due_date date not null,
  explanation text not null default '',
  todo text[] not null default '{}',
  paid boolean not null default false,
  created_at timestamptz not null default now()
);
create index deadlines_group_due on public.deadlines (group_id, due_date);

-- Registro delle letture IA, per la quota gratuita mensile.
create table public.scans (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null,
  created_at timestamptz not null default now()
);
create index scans_group_created on public.scans (group_id, created_at);

-- ---------------------------------------------------------------- RLS

create function public.my_group_id() returns uuid
language sql stable security definer set search_path = public as $$
  select group_id from public.members where user_id = auth.uid()
$$;

alter table public.groups enable row level security;
alter table public.members enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.deadlines enable row level security;
alter table public.scans enable row level security;

create policy "gruppo: lettura" on public.groups for select using (id = public.my_group_id());
create policy "gruppo: modifica" on public.groups for update using (id = public.my_group_id());
-- Il client può cambiare solo nome e obiettivo, non il premium.
revoke update on public.groups from authenticated, anon;
grant update (name, goal_name, goal_amount, goal_date) on public.groups to authenticated;

create policy "membri: lettura" on public.members for select using (group_id = public.my_group_id());
create policy "membri: profili senza account" on public.members for insert
  with check (group_id = public.my_group_id() and user_id is null);

create policy "categorie" on public.categories for all
  using (group_id = public.my_group_id()) with check (group_id = public.my_group_id());

create policy "movimenti" on public.transactions for all
  using (group_id = public.my_group_id()) with check (group_id = public.my_group_id());

create policy "scadenze" on public.deadlines for all
  using (group_id = public.my_group_id()) with check (group_id = public.my_group_id());

create policy "scansioni: lettura" on public.scans for select using (group_id = public.my_group_id());

-- ---------------------------------------------------------------- RPC

create function public.generate_invite_code() returns text
language plpgsql as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.groups where invite_code = code);
  end loop;
  return code;
end;
$$;

create function public.create_group(p_group_name text, p_member_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  new_group uuid;
begin
  if auth.uid() is null then raise exception 'non autenticato'; end if;
  if exists (select 1 from members where user_id = auth.uid()) then
    raise exception 'Fai già parte di una famiglia';
  end if;

  insert into groups (name, invite_code) values (trim(p_group_name), generate_invite_code())
    returning id into new_group;
  insert into members (group_id, user_id, name, color) values (new_group, auth.uid(), trim(p_member_name), '#2a78d6');
  insert into categories (group_id, name, type) values
    (new_group, 'Stipendio', 'entrata'), (new_group, 'Extra', 'entrata'),
    (new_group, 'Spesa', 'uscita'), (new_group, 'Casa', 'uscita'), (new_group, 'Bollette', 'uscita'),
    (new_group, 'Auto', 'uscita'), (new_group, 'Salute', 'uscita'), (new_group, 'Svago', 'uscita'),
    (new_group, 'Figli', 'uscita');
  return new_group;
end;
$$;

create function public.join_group(p_code text, p_member_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  target uuid;
  palette constant text[] := array['#2a78d6', '#eb6834', '#1baf7a', '#6250d6', '#e87ba4', '#eda100'];
  n int;
begin
  if auth.uid() is null then raise exception 'non autenticato'; end if;
  if exists (select 1 from members where user_id = auth.uid()) then
    raise exception 'Fai già parte di una famiglia';
  end if;
  select id into target from groups where invite_code = upper(trim(p_code));
  if target is null then raise exception 'Codice invito non valido'; end if;

  select count(*) into n from members where group_id = target;
  insert into members (group_id, user_id, name, color)
    values (target, auth.uid(), trim(p_member_name), palette[1 + (n % array_length(palette, 1))]);
  return target;
end;
$$;

-- Lasciare il gruppo mantiene il profilo (e lo storico dei movimenti) ma scollega l'account.
create function public.leave_group() returns void
language sql security definer set search_path = public as $$
  update members set user_id = null where user_id = auth.uid()
$$;

revoke execute on function public.create_group, public.join_group, public.leave_group from anon, public;
grant execute on function public.create_group, public.join_group, public.leave_group to authenticated;

-- ---------------------------------------------------------------- Realtime

alter publication supabase_realtime add table public.transactions, public.deadlines,
  public.categories, public.members, public.groups;
