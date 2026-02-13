export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      agents: {
        Row: {
          id: string;
          name: string;
          display_name: string;
          avatar: string;
          provider: string;
          model: string;
          description: string;
          api_key_hash: string;
          status: string;
          balance: number;
          total_bets: number;
          total_wins: number;
          total_losses: number;
          profit_loss: number;
          win_rate: number;
          created_at: string;
          last_active_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          display_name: string;
          avatar: string;
          provider: string;
          model: string;
          description: string;
          api_key_hash: string;
          status?: string;
          balance?: number;
          total_bets?: number;
          total_wins?: number;
          total_losses?: number;
          profit_loss?: number;
          win_rate?: number;
          created_at?: string;
          last_active_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          display_name?: string;
          avatar?: string;
          provider?: string;
          model?: string;
          description?: string;
          api_key_hash?: string;
          status?: string;
          balance?: number;
          total_bets?: number;
          total_wins?: number;
          total_losses?: number;
          profit_loss?: number;
          win_rate?: number;
          created_at?: string;
          last_active_at?: string;
        };
        Relationships: [];
      };
      markets: {
        Row: {
          id: string;
          title: string;
          description: string;
          category: string;
          creator_id: string;
          creator_name: string;
          status: string;
          outcomes: Json;
          total_volume: number;
          total_bets: number;
          unique_traders: number;
          resolution_date: string;
          resolved_outcome_id: string | null;
          created_at: string;
          updated_at: string;
          tags: string[];
          image_url: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          category: string;
          creator_id: string;
          creator_name: string;
          status?: string;
          outcomes: Json;
          total_volume?: number;
          total_bets?: number;
          unique_traders?: number;
          resolution_date: string;
          resolved_outcome_id?: string | null;
          created_at?: string;
          updated_at?: string;
          tags?: string[];
          image_url?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          category?: string;
          creator_id?: string;
          creator_name?: string;
          status?: string;
          outcomes?: Json;
          total_volume?: number;
          total_bets?: number;
          unique_traders?: number;
          resolution_date?: string;
          resolved_outcome_id?: string | null;
          created_at?: string;
          updated_at?: string;
          tags?: string[];
          image_url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "markets_creator_id_fkey";
            columns: ["creator_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
        ];
      };
      bets: {
        Row: {
          id: string;
          market_id: string;
          agent_id: string;
          agent_name: string;
          outcome_id: string;
          side: string;
          amount: number;
          shares: number;
          price: number;
          potential_payout: number;
          status: string;
          created_at: string;
          settled_at: string | null;
          profit: number | null;
        };
        Insert: {
          id?: string;
          market_id: string;
          agent_id: string;
          agent_name: string;
          outcome_id: string;
          side: string;
          amount: number;
          shares: number;
          price: number;
          potential_payout: number;
          status?: string;
          created_at?: string;
          settled_at?: string | null;
          profit?: number | null;
        };
        Update: {
          id?: string;
          market_id?: string;
          agent_id?: string;
          agent_name?: string;
          outcome_id?: string;
          side?: string;
          amount?: number;
          shares?: number;
          price?: number;
          potential_payout?: number;
          status?: string;
          created_at?: string;
          settled_at?: string | null;
          profit?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "bets_market_id_fkey";
            columns: ["market_id"];
            isOneToOne: false;
            referencedRelation: "markets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bets_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
        ];
      };
      activities: {
        Row: {
          id: string;
          market_id: string;
          agent_id: string;
          agent_name: string;
          agent_avatar: string;
          type: string;
          side: string | null;
          amount: number | null;
          outcome_label: string | null;
          timestamp: string;
        };
        Insert: {
          id?: string;
          market_id: string;
          agent_id: string;
          agent_name: string;
          agent_avatar: string;
          type: string;
          side?: string | null;
          amount?: number | null;
          outcome_label?: string | null;
          timestamp?: string;
        };
        Update: {
          id?: string;
          market_id?: string;
          agent_id?: string;
          agent_name?: string;
          agent_avatar?: string;
          type?: string;
          side?: string | null;
          amount?: number | null;
          outcome_label?: string | null;
          timestamp?: string;
        };
        Relationships: [
          {
            foreignKeyName: "activities_market_id_fkey";
            columns: ["market_id"];
            isOneToOne: false;
            referencedRelation: "markets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activities_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
