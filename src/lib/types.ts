// ─────────────────────────────────────────────────────────────────────────────
// Database type definitions – mirrors supabase/schema.sql
// Regenerate after schema changes:
//   npx supabase gen types typescript --project-id lolzhfepapsulilfqwurj > src/lib/types.ts
// ─────────────────────────────────────────────────────────────────────────────

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      // ── rounds ───────────────────────────────────────────────────────────
      rounds: {
        Row: {
          id: string
          title: string
          prompt: string
          status: 'open' | 'closed'
          started_at: string | null
          ended_at: string | null
          duration_minutes: number | null
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          prompt: string
          status?: 'open' | 'closed'
          started_at?: string | null
          ended_at?: string | null
          duration_minutes?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          prompt?: string
          status?: 'open' | 'closed'
          started_at?: string | null
          ended_at?: string | null
          duration_minutes?: number | null
          created_at?: string
        }
        Relationships: []
      }

      // ── players ──────────────────────────────────────────────────────────
      players: {
        Row: {
          id: string
          round_id: string
          device_id: string
          nome: string
          escola: string | null
          created_at: string
        }
        Insert: {
          id?: string
          round_id: string
          device_id: string
          nome: string
          escola?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          round_id?: string
          device_id?: string
          nome?: string
          escola?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'players_round_id_fkey'
            columns: ['round_id']
            isOneToOne: false
            referencedRelation: 'rounds'
            referencedColumns: ['id']
          }
        ]
      }

      // ── submissions ───────────────────────────────────────────────────────
      submissions: {
        Row: {
          id: string
          round_id: string
          player_id: string
          mensagem: string
          round_title: string | null
          round_prompt: string | null
          nota: number | null
          feedback: string | null
          criterios: Json | null
          status: 'pending' | 'evaluated' | 'error'
          hidden: boolean
          created_at: string
        }
        Insert: {
          id?: string
          round_id: string
          player_id: string
          mensagem: string
          round_title?: string | null
          round_prompt?: string | null
          nota?: number | null
          feedback?: string | null
          criterios?: Json | null
          status?: 'pending' | 'evaluated' | 'error'
          hidden?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          round_id?: string
          player_id?: string
          mensagem?: string
          round_title?: string | null
          round_prompt?: string | null
          nota?: number | null
          feedback?: string | null
          criterios?: Json | null
          status?: 'pending' | 'evaluated' | 'error'
          hidden?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'submissions_round_id_fkey'
            columns: ['round_id']
            isOneToOne: false
            referencedRelation: 'rounds'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'submissions_player_id_fkey'
            columns: ['player_id']
            isOneToOne: false
            referencedRelation: 'players'
            referencedColumns: ['id']
          }
        ]
      }

      // ── settings ──────────────────────────────────────────────────────────
      settings: {
        Row: {
          key: string
          value: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          key: string
          value?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          key?: string
          value?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      ranking_view: {
        Row: {
          posicao: number | null
          player_id: string
          device_id: string
          nome: string
          escola: string | null
          round_id: string
          round_title: string
          round_status: string
          melhor_nota: number
          tentativas: number
          primeira_melhor_nota_em: string
        }
        Relationships: []
      }
    }
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Domain entity types
// ─────────────────────────────────────────────────────────────────────────────

type Tables = Database['public']['Tables']

/** Round – sessão de disputa gerenciada pelo admin. */
export type Round = Tables['rounds']['Row']

/** Player – participante anônimo identificado por device_id dentro de uma rodada. */
export type Player = Tables['players']['Row']

/** Breakdown of AI evaluation criteria (each 0–20 with 1 decimal, score 0–100). */
export interface Criterios {
  creativity:        number
  clarity:           number
  software_relation: number
  impact:            number
  viability:         number
  score:             number  // authoritative computed total
  flagged:           boolean // true if content was flagged as inappropriate
}

/**
 * Submission – mensagem enviada por um player.
 * `avaliada` é computado: true quando nota !== null.
 * `hidden` indica submissão ocultada pelo admin (não aparece no ranking).
 */
export type Submission = Tables['submissions']['Row'] & { avaliada: boolean }

/** RankingEntry – posição calculada a partir das submissions. */
export interface RankingEntry {
  posicao: number
  player: Pick<Player, 'nome' | 'escola'>
  melhor_nota: number
  tentativas: number
}

