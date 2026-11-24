# Telefon-Assistent (KI-Sprachagent)

Ein KI-Assistent von ElevenLabs nimmt Anrufe an, wenn im Laden besetzt ist
oder niemand abnimmt (Rufumleitung beim Telefonanbieter).

**Was er kann**

1. Begrüßt mit dem aktuellen Öffnungsstatus und spricht die Sprache des Anrufers.
2. Sucht freie Termine und merkt sie vor. Die Anfrage erscheint unter
   **Online-Anfragen** und wird dort wie eine Website-Anfrage bestätigt.
3. Nennt den Stand eines Brillenauftrags, aber nur bei passendem Nachnamen
   und Geburtsdatum.
4. Beantwortet häufige Fragen aus dem hinterlegten Wissen.
5. Nimmt Rückrufbitten auf (eilige werden markiert).
6. Verweist bei Notfällen sofort an 112, eine Augenklinik oder 116 117.
7. Nach dem Gespräch landet alles auf der Seite **Telefon-Assistent** und als
   E-Mail beim Team.
8. Lernschleife: Fragen ohne Antwort stehen auf der Seite. Eine Antwort dort
   kennt der Assistent ab dem nächsten Anruf.

**Aufbau**

```
Anrufer → Telefonnummer (Twilio) → ElevenLabs-Agent
             │  Werkzeuge (Webhooks, Schlüssel x-telefon-schluessel)
             ▼
   Supabase Edge Function telefon-agent  ──►  Datenbank
   (supabase/functions/telefon-agent)          telefon_anruf, telefon_wissen,
             ▲                                 telefon_wissensluecke,
             │  nach dem Anruf (signiert)      buchung_anfrage (Termine)
          ElevenLabs
```

| Datei | Zweck |
|---|---|
| `prompt.md` | Gesprächsleitfaden des Agenten |
| `einrichten.mjs` | legt Werkzeuge und Agent bei ElevenLabs an bzw. aktualisiert sie |
| `.env` | Zugangsschlüssel (nur lokal, nicht im Repo) |
| `supabase/migrations/20261124090000_telefon_assistent.sql` | Tabellen und Funktionen |
| `my-admin/src/TelefonAssistentSeite.tsx` | Seite „Telefon-Assistent“ |

## Einrichtung (je Supabase-Projekt, zuerst Dev)

1. `telefon-agent/.env` ausfüllen (ElevenLabs-Schlüssel; Twilio erst für die
   echte Nummer).
2. Secrets setzen und Function bereitstellen:
   ```sh
   supabase secrets set --project-ref <ref> TELEFON_AGENT_SCHLUESSEL=<aus .env>
   supabase functions deploy telefon-agent --no-verify-jwt --project-ref <ref>
   ```
   Für die E-Mail ans Team werden die vorhandenen Secrets `RESEND_API_KEY` und
   `RESEND_FROM_ADDRESS` benutzt. Empfänger ist `TELEFON_AGENT_MELDUNG_AN`
   oder sonst die E-Mail aus den Betriebsdaten.
3. `node telefon-agent/einrichten.mjs` legt den Agenten an und zeigt einen
   Link zum Testen im Browser.
4. ElevenLabs → Agents → Settings:
   - **Post-call webhook** auf `…/telefon-agent/nach-anruf` anlegen. Das
     angezeigte Geheimnis als Secret `TELEFON_AGENT_WEBHOOK_SECRET` setzen.
   - **Conversation initiation webhook** auf `…/telefon-agent/start` mit der
     Kopfzeile `x-telefon-schluessel` (Secret) eintragen und im Agenten unter
     *Security* „Fetch initiation client data from webhook“ einschalten.
5. Telefonnummer: Twilio-Nummer kaufen und unter ElevenLabs → Phone Numbers
   importieren, dem Agenten zuordnen.
6. Beim eigenen Telefonanbieter eine Rufumleitung bei *besetzt* und *nach
   20 Sekunden* auf diese Nummer einrichten.

Prod: dieselben Schritte mit `SUPABASE_PROJEKT=cktdtojgrxskihihmnjm`, erst
nachdem die Migration über den Release-PR in Prod angekommen ist.

## Datenschutz

- Ansage zu Beginn: KI-Assistent. Die Gesprächsaufzeichnung bei ElevenLabs
  lässt sich in den Agent-Einstellungen begrenzen.
- Auftragsstatus nur mit Nachname und Geburtsdatum. Je Rufnummer sind
  höchstens 3 Fehlversuche am Tag erlaubt. Es werden keine Preise oder
  Gesundheitsdaten genannt.
- Mit ElevenLabs ist ein Auftragsverarbeitungsvertrag (DPA) nötig. In der
  Datenschutzerklärung den Telefon-Assistenten erwähnen.

## Testen

```sh
deno test supabase/functions/telefon-agent/logik.test.ts
```
