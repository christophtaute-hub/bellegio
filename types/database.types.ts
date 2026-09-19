export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      betreiber_einstellungen: {
        Row: {
          anschrift: string
          bankname: string | null
          bic: string | null
          firmenname: string
          fusszeile: string | null
          iban: string | null
          id: boolean
          rechnungsnummer_praefix: string
          steuernummer: string | null
          updated_at: string
          ust_hinweis: string | null
          ust_id: string | null
          ust_satz: number
          zahlungsziel_tage: number
        }
        Insert: {
          anschrift?: string
          bankname?: string | null
          bic?: string | null
          firmenname?: string
          fusszeile?: string | null
          iban?: string | null
          id?: boolean
          rechnungsnummer_praefix?: string
          steuernummer?: string | null
          updated_at?: string
          ust_hinweis?: string | null
          ust_id?: string | null
          ust_satz?: number
          zahlungsziel_tage?: number
        }
        Update: {
          anschrift?: string
          bankname?: string | null
          bic?: string | null
          firmenname?: string
          fusszeile?: string | null
          iban?: string | null
          id?: boolean
          rechnungsnummer_praefix?: string
          steuernummer?: string | null
          updated_at?: string
          ust_hinweis?: string | null
          ust_id?: string | null
          ust_satz?: number
          zahlungsziel_tage?: number
        }
        Relationships: []
      }
      booking_time_bands: {
        Row: {
          bundesland_code: string
          factor: number
          id: string
          label: string
          max_hours: number | null
          min_hours: number
          sort_order: number
        }
        Insert: {
          bundesland_code?: string
          factor: number
          id?: string
          label: string
          max_hours?: number | null
          min_hours: number
          sort_order?: number
        }
        Update: {
          bundesland_code?: string
          factor?: number
          id?: string
          label?: string
          max_hours?: number | null
          min_hours?: number
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "booking_time_bands_bundesland_code_fkey"
            columns: ["bundesland_code"]
            isOneToOne: false
            referencedRelation: "bundeslaender"
            referencedColumns: ["code"]
          },
        ]
      }
      bundeslaender: {
        Row: {
          code: string
          name: string
        }
        Insert: {
          code: string
          name: string
        }
        Update: {
          code?: string
          name?: string
        }
        Relationships: []
      }
      bw_personalschluessel: {
        Row: {
          altersmischung: boolean
          betriebsform: string
          bundesland_code: string
          id: string
          referenz_oeffnungszeit_stunden: number
          referenz_vzae: number
          stellen_pro_stunde: number
        }
        Insert: {
          altersmischung?: boolean
          betriebsform: string
          bundesland_code?: string
          id?: string
          referenz_oeffnungszeit_stunden: number
          referenz_vzae: number
          stellen_pro_stunde: number
        }
        Update: {
          altersmischung?: boolean
          betriebsform?: string
          bundesland_code?: string
          id?: string
          referenz_oeffnungszeit_stunden?: number
          referenz_vzae?: number
          stellen_pro_stunde?: number
        }
        Relationships: [
          {
            foreignKeyName: "bw_personalschluessel_bundesland_code_fkey"
            columns: ["bundesland_code"]
            isOneToOne: false
            referencedRelation: "bundeslaender"
            referencedColumns: ["code"]
          },
        ]
      }
      demo_anfragen: {
        Row: {
          bundesland: string
          created_at: string
          email: string
          id: string
          name: string
          nachricht: string | null
          organisation: string
          status: string
        }
        Insert: {
          bundesland?: string
          created_at?: string
          email: string
          id?: string
          name: string
          nachricht?: string | null
          organisation: string
          status?: string
        }
        Update: {
          bundesland?: string
          created_at?: string
          email?: string
          id?: string
          name?: string
          nachricht?: string | null
          organisation?: string
          status?: string
        }
        Relationships: []
      }
      einrichtung_berechtigungen: {
        Row: {
          bereich: string
          created_at: string
          einrichtung_id: string
          id: string
          updated_at: string
          user_id: string
          zugriff: string
        }
        Insert: {
          bereich: string
          created_at?: string
          einrichtung_id: string
          id?: string
          updated_at?: string
          user_id: string
          zugriff: string
        }
        Update: {
          bereich?: string
          created_at?: string
          einrichtung_id?: string
          id?: string
          updated_at?: string
          user_id?: string
          zugriff?: string
        }
        Relationships: [
          {
            foreignKeyName: "einrichtung_berechtigungen_einrichtung_id_fkey"
            columns: ["einrichtung_id"]
            isOneToOne: false
            referencedRelation: "einrichtungen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "einrichtung_berechtigungen_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      einrichtungen: {
        Row: {
          address_city: string | null
          address_street: string | null
          address_zip: string | null
          archived_at: string | null
          auswaertigen_quote_prozent: number | null
          bundesland_code: string
          created_at: string
          empfohlener_anstellungsschluessel: number
          id: string
          kita_year_start_month: number
          name: string
          standort_gemeinde: string | null
          trager_id: string
          updated_at: string
          vollzeit_wochenstunden: number
        }
        Insert: {
          address_city?: string | null
          address_street?: string | null
          address_zip?: string | null
          archived_at?: string | null
          auswaertigen_quote_prozent?: number | null
          bundesland_code?: string
          created_at?: string
          empfohlener_anstellungsschluessel?: number
          id?: string
          kita_year_start_month?: number
          name: string
          standort_gemeinde?: string | null
          trager_id: string
          updated_at?: string
          vollzeit_wochenstunden?: number
        }
        Update: {
          address_city?: string | null
          address_street?: string | null
          address_zip?: string | null
          archived_at?: string | null
          auswaertigen_quote_prozent?: number | null
          bundesland_code?: string
          created_at?: string
          empfohlener_anstellungsschluessel?: number
          id?: string
          kita_year_start_month?: number
          name?: string
          standort_gemeinde?: string | null
          trager_id?: string
          updated_at?: string
          vollzeit_wochenstunden?: number
        }
        Relationships: [
          {
            foreignKeyName: "einrichtungen_bundesland_code_fkey"
            columns: ["bundesland_code"]
            isOneToOne: false
            referencedRelation: "bundeslaender"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "einrichtungen_trager_id_fkey"
            columns: ["trager_id"]
            isOneToOne: false
            referencedRelation: "trager"
            referencedColumns: ["id"]
          },
        ]
      }
      gruppen: {
        Row: {
          archived_at: string | null
          bw_altersmischung: boolean
          bw_betriebsform: string | null
          bw_oeffnungszeit_stunden: number | null
          created_at: string
          einrichtung_id: string
          gruppenart: string
          id: string
          name: string
          nrw_buchungszeit_stunden: number | null
          nrw_gruppenform: string | null
          sollplatze: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          bw_altersmischung?: boolean
          bw_betriebsform?: string | null
          bw_oeffnungszeit_stunden?: number | null
          created_at?: string
          einrichtung_id: string
          gruppenart: string
          id?: string
          name: string
          nrw_buchungszeit_stunden?: number | null
          nrw_gruppenform?: string | null
          sollplatze?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          bw_altersmischung?: boolean
          bw_betriebsform?: string | null
          bw_oeffnungszeit_stunden?: number | null
          created_at?: string
          einrichtung_id?: string
          gruppenart?: string
          id?: string
          name?: string
          nrw_buchungszeit_stunden?: number | null
          nrw_gruppenform?: string | null
          sollplatze?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gruppen_einrichtung_id_fkey"
            columns: ["einrichtung_id"]
            isOneToOne: false
            referencedRelation: "einrichtungen"
            referencedColumns: ["id"]
          },
        ]
      }
      kind_weighting_factors: {
        Row: {
          id: string
          kind_id: string
          weighting_factor_id: string
        }
        Insert: {
          id?: string
          kind_id: string
          weighting_factor_id: string
        }
        Update: {
          id?: string
          kind_id?: string
          weighting_factor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kind_weighting_factors_kind_id_fkey"
            columns: ["kind_id"]
            isOneToOne: false
            referencedRelation: "children_place_calculation_view"
            referencedColumns: ["kind_id"]
          },
          {
            foreignKeyName: "kind_weighting_factors_kind_id_fkey"
            columns: ["kind_id"]
            isOneToOne: false
            referencedRelation: "kinder"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kind_weighting_factors_weighting_factor_id_fkey"
            columns: ["weighting_factor_id"]
            isOneToOne: false
            referencedRelation: "weighting_factors"
            referencedColumns: ["id"]
          },
        ]
      }
      kinder: {
        Row: {
          archived_at: string | null
          austritt: string | null
          betriebszugehoerigkeit: string | null
          buchungszeit_band_id: string | null
          created_at: string
          einrichtung_id: string
          einschulungsstatus: string | null
          eintritt: string | null
          geburtsdatum: string
          geschlecht: string
          gruppe_id: string | null
          hat_behinderung: boolean
          id: string
          nachname: string
          notizen: string | null
          platznummer: string | null
          status: string
          updated_at: string
          vertrag_gueltig_bis: string | null
          vorname: string
          wohnort: string | null
        }
        Insert: {
          archived_at?: string | null
          austritt?: string | null
          betriebszugehoerigkeit?: string | null
          buchungszeit_band_id?: string | null
          created_at?: string
          einrichtung_id: string
          einschulungsstatus?: string | null
          eintritt?: string | null
          geburtsdatum: string
          geschlecht?: string
          gruppe_id?: string | null
          hat_behinderung?: boolean
          id?: string
          nachname: string
          notizen?: string | null
          platznummer?: string | null
          status: string
          updated_at?: string
          vertrag_gueltig_bis?: string | null
          vorname: string
          wohnort?: string | null
        }
        Update: {
          archived_at?: string | null
          austritt?: string | null
          betriebszugehoerigkeit?: string | null
          buchungszeit_band_id?: string | null
          created_at?: string
          einrichtung_id?: string
          einschulungsstatus?: string | null
          eintritt?: string | null
          geburtsdatum?: string
          geschlecht?: string
          gruppe_id?: string | null
          hat_behinderung?: boolean
          id?: string
          nachname?: string
          notizen?: string | null
          platznummer?: string | null
          status?: string
          updated_at?: string
          vertrag_gueltig_bis?: string | null
          vorname?: string
          wohnort?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kinder_buchungszeit_band_id_fkey"
            columns: ["buchungszeit_band_id"]
            isOneToOne: false
            referencedRelation: "booking_time_bands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kinder_einrichtung_id_fkey"
            columns: ["einrichtung_id"]
            isOneToOne: false
            referencedRelation: "einrichtungen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kinder_gruppe_id_fkey"
            columns: ["gruppe_id"]
            isOneToOne: false
            referencedRelation: "gruppen"
            referencedColumns: ["id"]
          },
        ]
      }
      kinder_audit_log: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: string
          kind_id: string
          new_data: Json
          old_data: Json | null
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          kind_id: string
          new_data: Json
          old_data?: Json | null
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          kind_id?: string
          new_data?: Json
          old_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "kinder_audit_log_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kinder_audit_log_kind_id_fkey"
            columns: ["kind_id"]
            isOneToOne: false
            referencedRelation: "children_place_calculation_view"
            referencedColumns: ["kind_id"]
          },
          {
            foreignKeyName: "kinder_audit_log_kind_id_fkey"
            columns: ["kind_id"]
            isOneToOne: false
            referencedRelation: "kinder"
            referencedColumns: ["id"]
          },
        ]
      }
      nrw_personalstunden: {
        Row: {
          buchungszeit_stunden: number
          bundesland_code: string
          ergaenzungskraft_stunden: number
          fachkraft_stunden: number
          gruppenform: string
          id: string
          leitungsfreistellung_stunden: number
        }
        Insert: {
          buchungszeit_stunden: number
          bundesland_code?: string
          ergaenzungskraft_stunden: number
          fachkraft_stunden: number
          gruppenform: string
          id?: string
          leitungsfreistellung_stunden: number
        }
        Update: {
          buchungszeit_stunden?: number
          bundesland_code?: string
          ergaenzungskraft_stunden?: number
          fachkraft_stunden?: number
          gruppenform?: string
          id?: string
          leitungsfreistellung_stunden?: number
        }
        Relationships: [
          {
            foreignKeyName: "nrw_personalstunden_bundesland_code_fkey"
            columns: ["bundesland_code"]
            isOneToOne: false
            referencedRelation: "bundeslaender"
            referencedColumns: ["code"]
          },
        ]
      }
      platform_operators: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      platzwert_rules: {
        Row: {
          age_matches_expected: boolean
          bundesland_code: string
          gruppenart: string
          id: string
          platzwert: number
        }
        Insert: {
          age_matches_expected: boolean
          bundesland_code?: string
          gruppenart: string
          id?: string
          platzwert: number
        }
        Update: {
          age_matches_expected?: boolean
          bundesland_code?: string
          gruppenart?: string
          id?: string
          platzwert?: number
        }
        Relationships: [
          {
            foreignKeyName: "platzwert_rules_bundesland_code_fkey"
            columns: ["bundesland_code"]
            isOneToOne: false
            referencedRelation: "bundeslaender"
            referencedColumns: ["code"]
          },
        ]
      }
      rechnungen: {
        Row: {
          absender: Json | null
          bezahlt_am: string | null
          created_at: string
          created_by: string | null
          empfaenger: Json | null
          faellig_am: string | null
          id: string
          leistungszeitraum_bis: string
          leistungszeitraum_von: string
          notiz: string | null
          nummer: string | null
          rechnungsdatum: string | null
          status: string
          storno_von: string | null
          summe_brutto: number
          summe_netto: number
          summe_ust: number
          trager_id: string
          ust_satz: number
          versendet_am: string | null
        }
        Insert: {
          absender?: Json | null
          bezahlt_am?: string | null
          created_at?: string
          created_by?: string | null
          empfaenger?: Json | null
          faellig_am?: string | null
          id?: string
          leistungszeitraum_bis: string
          leistungszeitraum_von: string
          notiz?: string | null
          nummer?: string | null
          rechnungsdatum?: string | null
          status?: string
          storno_von?: string | null
          summe_brutto?: number
          summe_netto?: number
          summe_ust?: number
          trager_id: string
          ust_satz?: number
          versendet_am?: string | null
        }
        Update: {
          absender?: Json | null
          bezahlt_am?: string | null
          created_at?: string
          created_by?: string | null
          empfaenger?: Json | null
          faellig_am?: string | null
          id?: string
          leistungszeitraum_bis?: string
          leistungszeitraum_von?: string
          notiz?: string | null
          nummer?: string | null
          rechnungsdatum?: string | null
          status?: string
          storno_von?: string | null
          summe_brutto?: number
          summe_netto?: number
          summe_ust?: number
          trager_id?: string
          ust_satz?: number
          versendet_am?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rechnungen_storno_von_fkey"
            columns: ["storno_von"]
            isOneToOne: false
            referencedRelation: "rechnungen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rechnungen_trager_id_fkey"
            columns: ["trager_id"]
            isOneToOne: false
            referencedRelation: "trager"
            referencedColumns: ["id"]
          },
        ]
      }
      rechnungsnummern: {
        Row: {
          jahr: number
          letzte: number
        }
        Insert: {
          jahr: number
          letzte?: number
        }
        Update: {
          jahr?: number
          letzte?: number
        }
        Relationships: []
      }
      rechnungspositionen: {
        Row: {
          beschreibung: string
          einheit: string
          einrichtung_id: string | null
          einrichtung_name: string | null
          einzelpreis_netto: number
          id: string
          kinderzahl_snapshot: number | null
          menge: number
          pos: number
          rechnung_id: string
          summe_netto: number | null
        }
        Insert: {
          beschreibung: string
          einheit?: string
          einrichtung_id?: string | null
          einrichtung_name?: string | null
          einzelpreis_netto?: number
          id?: string
          kinderzahl_snapshot?: number | null
          menge?: number
          pos: number
          rechnung_id: string
          summe_netto?: number | null
        }
        Update: {
          beschreibung?: string
          einheit?: string
          einrichtung_id?: string | null
          einrichtung_name?: string | null
          einzelpreis_netto?: number
          id?: string
          kinderzahl_snapshot?: number | null
          menge?: number
          pos?: number
          rechnung_id?: string
          summe_netto?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rechnungspositionen_einrichtung_id_fkey"
            columns: ["einrichtung_id"]
            isOneToOne: false
            referencedRelation: "einrichtungen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rechnungspositionen_rechnung_id_fkey"
            columns: ["rechnung_id"]
            isOneToOne: false
            referencedRelation: "rechnungen"
            referencedColumns: ["id"]
          },
        ]
      }
      staffing_rules: {
        Row: {
          bundesland_code: string
          fachkraftquote_anteil: number
          mindestschluessel: number
        }
        Insert: {
          bundesland_code: string
          fachkraftquote_anteil: number
          mindestschluessel: number
        }
        Update: {
          bundesland_code?: string
          fachkraftquote_anteil?: number
          mindestschluessel?: number
        }
        Relationships: [
          {
            foreignKeyName: "staffing_rules_bundesland_code_fkey"
            columns: ["bundesland_code"]
            isOneToOne: true
            referencedRelation: "bundeslaender"
            referencedColumns: ["code"]
          },
        ]
      }
      team: {
        Row: {
          archived_at: string | null
          austritt: string | null
          created_at: string
          einrichtung_id: string
          eintritt: string | null
          fachkraft: boolean
          gruppe_id: string | null
          id: string
          nachname: string | null
          role_category: string
          rolle: string | null
          status: string
          updated_at: string
          vorname: string | null
          wochenstunden: number | null
        }
        Insert: {
          archived_at?: string | null
          austritt?: string | null
          created_at?: string
          einrichtung_id: string
          eintritt?: string | null
          fachkraft?: boolean
          gruppe_id?: string | null
          id?: string
          nachname?: string | null
          role_category: string
          rolle?: string | null
          status: string
          updated_at?: string
          vorname?: string | null
          wochenstunden?: number | null
        }
        Update: {
          archived_at?: string | null
          austritt?: string | null
          created_at?: string
          einrichtung_id?: string
          eintritt?: string | null
          fachkraft?: boolean
          gruppe_id?: string | null
          id?: string
          nachname?: string | null
          role_category?: string
          rolle?: string | null
          status?: string
          updated_at?: string
          vorname?: string | null
          wochenstunden?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "team_einrichtung_id_fkey"
            columns: ["einrichtung_id"]
            isOneToOne: false
            referencedRelation: "einrichtungen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_gruppe_id_fkey"
            columns: ["gruppe_id"]
            isOneToOne: false
            referencedRelation: "gruppen"
            referencedColumns: ["id"]
          },
        ]
      }
      team_audit_log: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: string
          new_data: Json
          old_data: Json | null
          team_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_data: Json
          old_data?: Json | null
          team_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_data?: Json
          old_data?: Json | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_audit_log_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_audit_log_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team"
            referencedColumns: ["id"]
          },
        ]
      }
      team_ausfallzeiten: {
        Row: {
          art: string
          bis: string | null
          created_at: string
          id: string
          notizen: string | null
          team_id: string
          updated_at: string
          von: string
        }
        Insert: {
          art: string
          bis?: string | null
          created_at?: string
          id?: string
          notizen?: string | null
          team_id: string
          updated_at?: string
          von: string
        }
        Update: {
          art?: string
          bis?: string | null
          created_at?: string
          id?: string
          notizen?: string | null
          team_id?: string
          updated_at?: string
          von?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_ausfallzeiten_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team"
            referencedColumns: ["id"]
          },
        ]
      }
      team_monthly_hours: {
        Row: {
          created_at: string
          id: string
          month: string
          team_id: string
          updated_at: string
          wochenstunden: number
        }
        Insert: {
          created_at?: string
          id?: string
          month: string
          team_id: string
          updated_at?: string
          wochenstunden: number
        }
        Update: {
          created_at?: string
          id?: string
          month?: string
          team_id?: string
          updated_at?: string
          wochenstunden?: number
        }
        Relationships: [
          {
            foreignKeyName: "team_monthly_hours_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team"
            referencedColumns: ["id"]
          },
        ]
      }
      trager: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      trager_abrechnung: {
        Row: {
          preis_grundgebuehr_pro_einrichtung: number | null
          preis_pro_kind: number | null
          rechnungs_email: string | null
          rechnungsanschrift: string | null
          rechnungsname: string | null
          trager_id: string
          updated_at: string
          ust_id: string | null
        }
        Insert: {
          preis_grundgebuehr_pro_einrichtung?: number | null
          preis_pro_kind?: number | null
          rechnungs_email?: string | null
          rechnungsanschrift?: string | null
          rechnungsname?: string | null
          trager_id: string
          updated_at?: string
          ust_id?: string | null
        }
        Update: {
          preis_grundgebuehr_pro_einrichtung?: number | null
          preis_pro_kind?: number | null
          rechnungs_email?: string | null
          rechnungsanschrift?: string | null
          rechnungsname?: string | null
          trager_id?: string
          updated_at?: string
          ust_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trager_abrechnung_trager_id_fkey"
            columns: ["trager_id"]
            isOneToOne: true
            referencedRelation: "trager"
            referencedColumns: ["id"]
          },
        ]
      }
      user_einrichtungen: {
        Row: {
          created_at: string
          einrichtung_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          einrichtung_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          einrichtung_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_einrichtungen_einrichtung_id_fkey"
            columns: ["einrichtung_id"]
            isOneToOne: false
            referencedRelation: "einrichtungen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_einrichtungen_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          kann_rechte_verwalten: boolean
          role: string
          trager_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          kann_rechte_verwalten?: boolean
          role: string
          trager_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          kann_rechte_verwalten?: boolean
          role?: string
          trager_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_trager_id_fkey"
            columns: ["trager_id"]
            isOneToOne: false
            referencedRelation: "trager"
            referencedColumns: ["id"]
          },
        ]
      }
      weighting_factors: {
        Row: {
          bundesland_code: string
          code: string
          factor: number
          id: string
          label: string
        }
        Insert: {
          bundesland_code?: string
          code: string
          factor: number
          id?: string
          label: string
        }
        Update: {
          bundesland_code?: string
          code?: string
          factor?: number
          id?: string
          label?: string
        }
        Relationships: [
          {
            foreignKeyName: "weighting_factors_bundesland_code_fkey"
            columns: ["bundesland_code"]
            isOneToOne: false
            referencedRelation: "bundeslaender"
            referencedColumns: ["code"]
          },
        ]
      }
    }
    Views: {
      children_place_calculation_view: {
        Row: {
          einrichtung_id: string | null
          gruppe_id: string | null
          gruppenart: string | null
          kind_id: string | null
          platzwert: number | null
        }
        Relationships: [
          {
            foreignKeyName: "kinder_einrichtung_id_fkey"
            columns: ["einrichtung_id"]
            isOneToOne: false
            referencedRelation: "einrichtungen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kinder_gruppe_id_fkey"
            columns: ["gruppe_id"]
            isOneToOne: false
            referencedRelation: "gruppen"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      kind_max_weighting_factor: {
        Args: { p_kind_id: string }
        Returns: {
          code: string
          factor: number
          label: string
          weighting_factor_id: string
        }[]
      }
      kind_max_weighting_factor_ohne_integration: {
        Args: { p_kind_id: string }
        Returns: {
          code: string
          factor: number
          label: string
          weighting_factor_id: string
        }[]
      }
      kinder_presence_at_date: {
        Args: { p_einrichtung_id: string; p_stichtag: string }
        Returns: {
          buchungszeit_band_id: string
          buchungszeit_factor: number
          buchungszeit_label: string
          gruppe_id: string
          kind_id: string
          weighting_factor_code: string
          weighting_factor_id: string
          weighting_factor_label: string
          weighting_factor_value: number
          weighting_factor_value_fachkraftquote: number
        }[]
      }
      operator_kennzahlen: {
        Args: { p_stichtag: string }
        Returns: {
          aktive_kinder: number
          bundesland_code: string
          einrichtung_id: string
          einrichtung_name: string
          gruppen: number
          trager_id: string
          trager_name: string
        }[]
      }
      rechnung_freigeben: { Args: { p_id: string }; Returns: string }
      rechnung_positionen_setzen: {
        Args: { p_id: string; p_positionen: Json }
        Returns: undefined
      }
      rechnung_stornieren: { Args: { p_id: string }; Returns: string }
      team_presence_at_date: {
        Args: { p_einrichtung_id: string; p_stichtag: string }
        Returns: {
          fachkraft: boolean
          nachname: string
          rolle: string
          team_id: string
          vorname: string
          wochenstunden: number
        }[]
      }
      team_presence_for_month: {
        Args: { p_einrichtung_id: string; p_month: string }
        Returns: {
          nachname: string
          role_category: string
          rolle: string
          team_id: string
          vorname: string
          wochenstunden: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
