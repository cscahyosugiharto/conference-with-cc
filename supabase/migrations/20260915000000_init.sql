-- ICOS 2027 seat bookings.
-- Run in the Supabase SQL editor (or `supabase db push`) before first deploy.

create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  seat text not null unique,
  full_name text not null,
  country_code text not null,
  whatsapp_number text not null,
  whatsapp_e164 text not null,
  email text not null,
  category text not null check (category in ('gold', 'blue', 'gray')),
  ticket_id text not null unique,
  created_at timestamptz not null default now(),
  constraint seat_format check (seat ~ '^[A-O]([1-9]|1[0-9]|20)$'),
  constraint full_name_len check (char_length(btrim(full_name)) between 2 and 80),
  constraint email_format check (email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
);

create index if not exists registrations_created_at_idx
  on public.registrations (created_at desc);

create index if not exists registrations_email_idx
  on public.registrations (lower(email));

create table if not exists public.section_gates (
  id text primary key check (id in ('gold', 'blue', 'gray')),
  open boolean not null,
  updated_at timestamptz not null default now()
);

insert into public.section_gates (id, open) values
  ('gold', true),
  ('blue', false),
  ('gray', false)
on conflict (id) do nothing;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists section_gates_updated_at on public.section_gates;
create trigger section_gates_updated_at
  before update on public.section_gates
  for each row
  execute function public.set_updated_at();

alter table public.registrations enable row level security;
alter table public.section_gates enable row level security;

-- Anon/authenticated cannot read PII. The Next.js server uses the service role
-- (bypasses RLS) for writes, deletes, and the admin list.

drop policy if exists "Anyone can read section gates" on public.section_gates;
create policy "Anyone can read section gates"
  on public.section_gates
  for select
  to anon, authenticated
  using (true);

-- Occupied seats only: no names, WhatsApp, or email.
create or replace view public.occupied_seats as
  select seat, category
  from public.registrations;

alter view public.occupied_seats set (security_invoker = false);

grant select on public.occupied_seats to anon, authenticated;
grant select on public.section_gates to anon, authenticated;

revoke insert, update, delete on public.registrations from anon, authenticated;
revoke insert, update, delete on public.section_gates from anon, authenticated;
revoke select on public.registrations from anon, authenticated;
