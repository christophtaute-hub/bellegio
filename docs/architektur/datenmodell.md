# Datenmodell

Quelle: die Migrationen in `supabase/migrations/` (81 Dateien, Stand 21.10.2026). Es gibt 58 Tabellen im Schema `public` und eine View (`children_place_calculation_view`). Der tatsächliche Datenstand der Datenbank ist hier nicht abgebildet, nur die Struktur. Was aus den Migrationen nicht hervorgeht, ist mit „unklar“ gekennzeichnet.

**Gemeinsame Muster**
- Zeilenschutz (RLS) ist auf allen Tabellen aktiv ([Entscheidung 0002](../entscheidungen/0002-zugriff-im-zeilenschutz.md)).
- Fast alle Tabellen haben `id`, `created_at`, `updated_at` (Trigger `set_updated_at`).
- **Operator** = Betreiber (`app.is_platform_operator()`). **Zugriff(X)** = `app.current_user_zugriff(einrichtung_id, 'X')` mit `kein_zugriff`, `ansehen`, `bearbeiten`. **Lesen (Einr.)** = `app.user_has_einrichtung_access`. **Schreiben Belegung/Personal/Finanzen/Gehälter** = Zugriff im jeweiligen Bereich ist `bearbeiten`.
- Wo es keine Schreib-Policy gibt, schreibt nur die Service-Rolle (Server) oder ein Trigger/eine RPC.

## 0. Berechtigungsmodell in Kürze

Rollen in `user_profiles.role`: `traeger_admin`, `einrichtungsleitung`, `belegung`, `personal`, `controlling`, `mitarbeiter` (die drei Bereichsrollen sind abgelöst, neue Nutzer sind `mitarbeiter`). Bereiche: `belegung`, `personal`, `controlling`, `szenario`, `finanzen`, `gehaelter`.

Effektiver Zugriff:
1. Einrichtung gehört nicht zum eigenen Träger → `kein_zugriff`.
2. `traeger_admin` → immer `bearbeiten`.
3. `einrichtungsleitung` → eine Zeile in `einrichtung_berechtigungen` überschreibt; ohne Zeile `bearbeiten`, außer `finanzen` und `gehaelter` (dort `kein_zugriff`).
4. Alle anderen → nur die Zeile in `einrichtung_berechtigungen`, sonst `kein_zugriff`.

Lesen ist einrichtungsweit vereinheitlicht (wer irgendeinen Bereich sehen darf, darf die Einrichtung lesen), Schreiben wird je Bereich geprüft.

## 1. Stammdaten und Rechte

| Tabelle | Zweck | Lesen / Schreiben | Besonderheiten |
| --- | --- | --- | --- |
| `trager` | Mandant (Träger) | Lesen: eigener Träger oder Operator; Schreiben nur Service-Rolle | |
| `einrichtungen` | Einrichtung eines Trägers | Lesen: Lesen (Einr.) oder Operator; Insert/Update: `traeger_admin`; zusätzlich Update bei Schreiben Finanzen | `archived_at` (Soft-Delete); Spalten-Guard-Trigger (s. u.) |
| `gruppen` | Gruppen einer Einrichtung | Lesen: Lesen (Einr.); Insert/Update: Schreiben Belegung | `archived_at`; BW: Betriebsform, Altersmischung, Öffnungs- und Randzeit; NRW: Gruppenform, Buchungszeit |
| `user_profiles` | Profil zu `auth.users` (ein Nutzer = ein Träger) | Lesen: eigene Zeile oder Träger; Update: eigene Zeile oder `traeger_admin` | Trigger `prevent_self_role_escalation`; `ist_demo` für Demo-Konten |
| `user_einrichtungen` | alte Zuordnung | — | ungenutzt, von den Helfern abgelöst |
| `einrichtung_berechtigungen` | Rechte je Nutzer × Einrichtung × Bereich | Lesen: eigene Zeilen bzw. (Admin/Rechteverwalter/lokaler Admin) des Trägers; Schreiben: `traeger_admin` unbegrenzt, andere nur bis zum eigenen Niveau (`zugriff_rang`) | |
| `einrichtung_lokale_admins` | lokaler Admin je Einrichtung | Lesen: eigene Zeile oder `traeger_admin`; Schreiben: `traeger_admin` | eigene Tabelle statt Flag |
| `marketing_zugang` | trägerweites Marketing-Recht | Lesen: eigene Zeile oder `traeger_admin`; Schreiben: `traeger_admin` | `traeger_admin` hat es immer |

**`einrichtungen` im Detail:** Adresse und Kontakt, `bundesland_code` (fest nach dem Anlegen), `kita_year_start_month`, `vollzeit_wochenstunden` (Standard 39), `kostenstelle`, `cluster`, `standort_gemeinde`, `auswaertigen_quote_prozent` (nur beratend), `loeschfrist_monate`; Finanzen: `foerderung_monatlich_manuell` (hat immer Vorrang vor der Formel), `lohnnebenkosten_prozent` (28), `jahressonderzahlung_prozent` (85), `personalprogramme_foerderung_monatlich`, `sonstige_kosten_monatlich`, `teamkraefte_pauschale_aktiv`; Elternbeiträge: `geschwister_zweit_prozent`, `geschwister_ab_dritt_prozent`, `elternbeitragszuschuss_bis`.

> **Bekannte Lücke:** Der Spalten-Guard `restrict_einrichtungen_finanzen_columns` sperrt für Nicht-Träger-Admins nur Name, Adresse, Bundesland, Vollzeit-Referenz, Träger, Archivierung, Standort-Gemeinde, Auswärtigen-Quote, Löschfrist, Kostenstelle und Cluster. Neuere Spalten (Kontaktfelder, Öffnungszeiten, Geschwister-Prozente, Zuschuss-Datum, Teamkräfte-Schalter) kann jemand mit Schreibrecht „Finanzen“ ebenfalls ändern. Ob das gewollt ist, ist nicht dokumentiert.

## 2. Kinder

| Tabelle | Zweck | Lesen / Schreiben | Besonderheiten |
| --- | --- | --- | --- |
| `kinder` | Kind (aktiv, Nachrücker, geplant) | Lesen: Lesen (Einr.); Insert/Update: Schreiben Belegung; Löschen nur über RPC | `archived_at`; Trigger → `kinder_audit_log` |
| `kind_weighting_factors` | manuell gesetzte Sondermerkmale | Lesen: Lesen (Einr.); Insert/Delete: Schreiben Belegung | in Bayern werden die Basisfaktoren (unter 3 / ab 3) abgeleitet, nicht hier gelesen |
| `kinder_audit_log` | Änderungsprotokoll (ganze Zeile alt/neu) | Lesen: Lesen (Einr.); Schreiben nur per Trigger | nur anfügbar |
| `kind_buchungszeit_historie` | welches Buchungszeit-Band ab wann galt | Lesen: Lesen (Einr.); Insert: Schreiben Belegung; kein Update/Delete | gültig ist die Zeile mit dem größten `gueltig_ab ≤ Stichtag` |
| `kind_gruppen_historie` | Gruppenzugehörigkeit über die Zeit, inkl. geplanter Wechsel | Insert: Schreiben Belegung; Löschen nur geplanter Wechsel (`gueltig_ab > heute`) | täglicher pg_cron-Job `gruppenwechsel-anwenden` zieht `kinder.gruppe_id` nach |
| `kind_notizen_verlauf` | Notizen mit Datum und Autor | Insert: Schreiben Belegung; kein Update/Delete | ersetzt das überschreibbare `kinder.notizen` (bleibt für Altdaten) |

**`kinder` im Detail:** Gruppe, Status, Eintritt, Austritt, Vertrag-gültig-bis, `ersetzt_kind_id` (Nachrücker auf dem Platz eines anderen Kindes), Name, Geburtsdatum, Geschlecht, Wohnort, `geschwister_nummer`, `buchungszeit_band_id` (aktueller Wert; Verlauf in der Historie), `einschulungsstatus`, `hat_behinderung` und `i_status_von/bis`, Import-Felder `externe_id` und `datenquelle`. Regeln in der Datenbank: aktive Kinder brauchen eine Gruppe; aktive Kinder und Nachrücker brauchen ein Austrittsdatum; der Austritt ist immer ein Monatsletzter.

## 3. Team

| Tabelle | Zweck | Lesen / Schreiben | Besonderheiten |
| --- | --- | --- | --- |
| `team` | Mitarbeitende | Lesen: Lesen (Einr.); Insert/Update: Schreiben Personal; Löschen nur über RPC | `role_category` (Fachkraft, Ergänzungskraft …); Trigger → `team_audit_log`; **keine Gehaltsfelder** |
| `team_monthly_hours` | abweichende Wochenstunden je Monat | Lesen: Lesen (Einr.); Schreiben: Schreiben Personal | hat Vorrang vor `team.wochenstunden` |
| `team_ausfallzeiten` | Mutterschutz, Schwangerschaft, Krankheit, Sonderurlaub, sonstiges | Schreiben: Schreiben Personal | deckt ein Ausfall den ganzen Monat ab, zählt der Monat mit 0 Stunden |
| `team_audit_log` | Änderungsprotokoll | nur per Trigger | nur anfügbar |
| `team_verguetung` | Entgeltgruppe, Stufe, manuelles Gehalt (1:1 zu `team`) | Lesen: Recht `gehaelter` ansehen; Schreiben: Schreiben Gehälter | eigene Tabelle, [Entscheidung 0003](../entscheidungen/0003-rechte-je-bereich-und-gehaelter.md) |
| `team_verguetung_audit_log` | Protokoll der Vergütung | Lesen: Recht `gehaelter` | nur anfügbar |

## 4. Regelwerk (je Bundesland, versioniert)

Gemeinsam: lesbar für alle angemeldeten Nutzer, geschrieben nur per Migration oder Service-Rolle. Jede Live-Tabelle hat `gueltig_ab`; die Vorgängerfassungen stehen in `<tabelle>_historie` mit `gueltig_ab` und `gueltig_bis`. Kein Trigger ([Entscheidung 0006](../entscheidungen/0006-versioniertes-regelwerk.md)); die Auflösung zum Stichtag steht in `lib/regelwerk/verlauf.ts`.

| Tabelle | Inhalt |
| --- | --- |
| `bundeslaender` | `by`, `bw`, `nrw` |
| `weighting_factors` | Bayern: Gewichtungsfaktoren (unter 3 = 2,0 · ab 3 = 1,0 · Schulkind 1,2 · nichtdeutschsprachig 1,3 · Hort 1,3 · Integration 4,5) |
| `booking_time_bands` | Buchungszeit-Bänder je Land (Bayern Stunden/Tag mit Förderfaktor 0,5–2,5; NRW 25/35/45 Std.; BW Wochenstunden-Bänder) |
| `platzwert_rules` | Platzwert je Gruppenart und Altersübereinstimmung |
| `staffing_rules` | Bayern: Mindestschlüssel 11,0 und Fachkraftquote 0,5 (Schlüssel = Bundesland) |
| `bw_personalschluessel` | BW: Mindestpersonalschlüssel je Betriebsform und Altersmischung |
| `nrw_personalstunden` | NRW: Fachkraft-, Ergänzungskraft- und Leitungsstunden je Gruppenform × Buchungszeit |
| `bayern_foerderung_basiswert` | Basiswert, Qualitätsbonus, Sätze der Teamkräftepauschale (2026 bis 2029) |
| `nrw_kindpauschalen` | Kindpauschale je Gruppenform × Buchungszeit (€ je Jahr), 2025/26 in der Historie, 2026/27 aktuell |
| `tvoed_sue_entgelt` | TVöD-SuE-Tabelle S2–S18 × Stufe 1–6, gültig ab 01.05.2026 (bundesweit) |

Quellenvorbehalte (stehen in den Migrationskommentaren): `nrw_personalstunden` und `bw_personalschluessel` sind nicht vollständig gegen die Primärquelle geprüft; die Bayern-Werte ab 2027 sind vorläufig; zwei BW-Bänder sind nicht belegt.

## 5. Finanzen

| Tabelle | Zweck | Lesen / Schreiben |
| --- | --- | --- |
| `einrichtung_beitraege` | Preisliste der Elternbeiträge je Band, optional nach Krippe/Kindergarten und Wohnsitz, mit `gueltig_ab` | Lesen: Recht `finanzen`; Schreiben: Schreiben Finanzen |
| `kitajahr_planung` | gespeicherter Plan je Einrichtung und Kitajahr (jsonb) | Lesen: `szenario` ansehen; Schreiben: `szenario` bearbeiten |

`finanzen` gilt für Summen und die Preisliste, `gehaelter` für Einzelvergütungen. Beides ist für die Einrichtungsleitung standardmäßig aus.

## 6. Marketing

Marketing liest weder Kinder noch Team noch die Tabelle `einrichtungen`; Stammdaten kommen über die abgesicherten Abfragen `marketing_einrichtungen()` und `marketing_nutzer()` ([Entscheidung 0010](../entscheidungen/0010-betreiber-und-marketing-getrennt.md)).

| Tabelle | Zweck | Besonderheiten |
| --- | --- | --- |
| `marketing_bewertung` | vier Ampeln je Einrichtung (Personalbedarf 0–3, personelle und pädagogische Qualität 0–2, Belegung 0–3) und Zusatzwerte | Trigger → `marketing_protokoll` |
| `marketing_kampagne` | Kampagnen (Personal/Belegung, Meta/Google/Sonstiges, Zeitraum, Budget, Kosten, nächster Schritt) | kein Löschen, Status „beendet“; Trigger → Protokoll |
| `marketing_einstellungen` | Fristen und Schwellwerte je Träger | fehlt die Zeile, gelten App-Standardwerte |
| `marketing_protokoll` | Änderungsprotokoll | nur anfügbar |

## 7. Betreiber und Abrechnung

Der Betreiber steht in `platform_operators` (nur per SQL eintragbar). Er sieht trägerübergreifend Stammdaten und über `operator_kennzahlen` Aggregate, nie Kinder- oder Personaldaten.

| Tabelle | Zweck | Zugriff |
| --- | --- | --- |
| `platform_operators` | Betreiber-Nutzer | nur die eigene Zeile |
| `betreiber_einstellungen` | Absender- und Bankdaten für Rechnungen | nur Operator |
| `betreiber_oeffentlich` | Angaben für Impressum, Datenschutz, AGB, AVV; Schalter `rechtstexte_geprueft` | Lesen: öffentlich; Ändern: Operator |
| `listenpreise` | Listenpreise der Landingpage (Grundgebühr, drei Staffelstufen je Kind) | Lesen: öffentlich; Ändern: Operator |
| `trager_abrechnung` | Rechnungsdaten und eigene Preise je Träger | nur Operator |
| `rechnungen`, `rechnungspositionen`, `rechnungsnummern` | Rechnungen mit Nummernkreis | nur Operator; freigegebene Rechnungen sind unveränderlich (nur Status, Zahlungsdatum, Notiz), Storno erzeugt eine Gutschrift |
| `demo_anfragen` | Anfragen vom Demo-Formular | Einfügen: öffentlich; Lesen/Ändern: Operator |
| `vertragszustimmungen` | Zustimmung der Träger-Admins zu AGB/AVV mit Version | nur anfügbar |

## 8. Protokolle und Sonstiges

| Tabelle | Zweck |
| --- | --- |
| `server_fehler_protokoll` | Fehler aus Server Actions; schreibbar über den normalen Client, lesbar nur über Service-Rolle/Admin |
| `massnahmen` | Maßnahmen zu den Kita-Ampeln (Belegung/Personal) mit Status; kein Löschen, der Verlauf bleibt |
| `loeschprotokoll` | Löschungen und Anonymisierungen ohne personenbezogene Inhalte; lesbar für `traeger_admin` |

## 9. Funktionen

**Schema `app` (nicht per API erreichbar):** Rechtehelfer (`current_user_trager_id`, `current_user_role`, `user_has_einrichtung_access`, `current_user_zugriff`, `current_user_can_write_*`/`_view_*`, `current_user_ist_lokaler_admin`, `zugriff_rang`, `is_platform_operator`, `marketing_zugriff`, `marketing_darf`) sowie Schutz-Trigger (`prevent_self_role_escalation`, `restrict_einrichtungen_finanzen_columns`, `marketing_protokollieren`) und die Datenschutz-Funktionen `kind_datenschutz`/`team_datenschutz` (Löschen oder Anonymisieren mit Eigenprüfung auf `traeger_admin`, schreibt `loeschprotokoll`).

**Schema `public`:**
- `kinder_presence_at_date(einrichtung, stichtag)` — Kinder am Stichtag mit Gruppe, Band und Gewichtungsfaktor, über die Historien aufgelöst.
- `kind_gewichtung_am_stichtag` — höchster Faktor; in Bayern wird der Basisfaktor aus Geburtsdatum, Gruppenart und Kitajahr abgeleitet.
- `team_presence_at_date`, `team_presence_for_month` — Personal mit effektiven Wochenstunden je Monat und Gruppe.
- `audit_zusammenfassung` — Änderungen je Monat aus den Protokollen.
- `rechnung_positionen_setzen`, `rechnung_freigeben`, `rechnung_stornieren`, `operator_kennzahlen` — nur für den Betreiber.
- `wende_gruppenwechsel_an` — vom täglichen Cron-Job genutzt.
- `marketing_einrichtungen`, `marketing_nutzer` — abgesicherte Abfragen für Marketing.
- Trigger-Funktionen für Protokolle und Rechnungsschutz; ihr `EXECUTE`-Recht ist entzogen.

## Hinweise zur Faktenlage

Zwei Backfills wurden separat per SQL ausgeführt (`20261001090000`, `20260927134001`) und stehen nicht in den Migrationen. Der Inhalt der jsonb-Felder `kitajahr_planung.daten` und `marketing_einstellungen.grenzen/kriterien` ergibt sich nicht aus den Migrationen (siehe `lib/planung/` und `lib/marketing/`). Die Aufbewahrung von `demo_anfragen` ist als Zahl hinterlegt (`aufbewahrung_anfragen_monate`), eine automatische Löschung ist in den Migrationen nicht erkennbar.
