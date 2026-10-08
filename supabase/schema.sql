-- Esquema de Supabase para "¿Con qué pago?". Pegalo en Supabase → SQL Editor → New query → Run.

-- Perfil de cada usuario: medios de pago que tiene, rubros que le interesan y si quiere alertas.
create table if not exists public.profiles (
  user_id    uuid primary key references auth.users on delete cascade,
  medios     text[] not null default '{}',
  rubros     text[] not null default '{}',
  alertas    boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists "perfil propio" on public.profiles;
create policy "perfil propio" on public.profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Suscripciones push (una por dispositivo). Las lee el envío diario con la service role key.
create table if not exists public.push_subscriptions (
  endpoint   text primary key,
  user_id    uuid not null references auth.users on delete cascade,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
drop policy if exists "suscripciones propias" on public.push_subscriptions;
create policy "suscripciones propias" on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
