-- Issue #90: Berechtigungsschein zur Abrechnung von Sehhilfen (§ 33 SGB V).
--
-- Abschnitt 2 des Formulars ("Angaben zum Leistungserbringer") braucht
-- Betrieb/Stempel-Bezeichnung, IK-Nummer (Institutionskennzeichen) und ob der
-- Betrieb gemäß § 126 SGB V präqualifiziert ist. Anders als die
-- Absenderdaten der Rechnung (siehe rechnungTemplate.ts, dort bewusst als
-- Konstante hinterlegt, da nur für ein Design 1:1 nachgebildet) sind das
-- rechtlich relevante Stammdaten, die einmalig gepflegt und ohne Code-Deploy
-- änderbar sein sollen - daher eine eigene Tabelle statt einer Konstante.
--
-- Enthält immer genau eine Zeile (id = 1); es gibt bislang keinen Bedarf für
-- mehrere Betriebsstätten.
--
-- See: https://github.com/DerDawo/OptikSystemMVP/issues/90

create table if not exists public.betrieb (
  id bigint primary key default 1,
  created_at timestamptz not null default now(),
  "Name" text not null default '',
  "IKNummer" text not null default '',
  "Praequalifiziert" boolean not null default false,
  constraint betrieb_singleton_id check (id = 1)
);

comment on table public.betrieb is 'Einmalig zu pflegende Betriebsstammdaten des Leistungserbringers (Betrieb/Stempel, IK-Nummer, Präqualifizierung nach § 126 SGB V), Issue #90. Enthält immer genau eine Zeile mit id = 1.';

alter table public.betrieb enable row level security;

drop policy if exists "Authenticated users can manage betrieb" on public.betrieb;
create policy "Authenticated users can manage betrieb" on public.betrieb
  for all
  to authenticated
  using (true)
  with check (true);

insert into public.betrieb (id, "Name", "IKNummer", "Praequalifiziert")
values (1, '', '', false)
on conflict (id) do nothing;
