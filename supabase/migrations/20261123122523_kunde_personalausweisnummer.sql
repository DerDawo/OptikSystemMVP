-- Neues Feld "Personalausweisnummer" in der Kundenkarte; die
-- Führerschein-Bescheinigung übernimmt sie in das Feld "Ausweisnummer".
alter table public.kunde
  add column if not exists "Personalausweisnummer" text;
