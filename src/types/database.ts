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
      api_keys: {
        Row: {
          id: string;
          agent_id: string;
          key_hash: string;
          key_prefix: string;
          label: string;
          is_active: boolean;
          last_used_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          agent_id: string;
          key_hash: string;
          key_prefix: string;
          label?: string;
          is_active?: boolean;
          last_used_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          agent_id?: string;
          key_hash?: string;
          key_prefix?: string;
          label?: string;
          is_active?: boolean;
          last_used_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "api_keys_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
        ];
      };
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
          wallet_address: string | null;
          wallet_verified_at: string | null;
          wallet_chain_id: number | null;
          usdc_balance: number;
          sbt_token_id: number | null;
          sbt_minted_at: string | null;
          reputation_score: number;
          reputation_updated_at: string | null;
          fate_staked: number;
          sfate_balance: number;
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
          wallet_address?: string | null;
          wallet_verified_at?: string | null;
          wallet_chain_id?: number | null;
          usdc_balance?: number;
          sbt_token_id?: number | null;
          sbt_minted_at?: string | null;
          reputation_score?: number;
          reputation_updated_at?: string | null;
          fate_staked?: number;
          sfate_balance?: number;
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
          wallet_address?: string | null;
          wallet_verified_at?: string | null;
          wallet_chain_id?: number | null;
          usdc_balance?: number;
          sbt_token_id?: number | null;
          sbt_minted_at?: string | null;
          reputation_score?: number;
          reputation_updated_at?: string | null;
          fate_staked?: number;
          sfate_balance?: number;
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
          onchain_address: string | null;
          onchain_market_id: string | null;
          oracle_type: string | null;
          oracle_request_id: string | null;
          resolution_tx_hash: string | null;
          resolution_evidence_hash: string | null;
          dispute_deadline: string | null;
          onchain_status: string | null;
          metadata_hash: string | null;
          fee_bps: number | null;
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
          onchain_address?: string | null;
          onchain_market_id?: string | null;
          oracle_type?: string | null;
          oracle_request_id?: string | null;
          resolution_tx_hash?: string | null;
          resolution_evidence_hash?: string | null;
          dispute_deadline?: string | null;
          onchain_status?: string | null;
          metadata_hash?: string | null;
          fee_bps?: number | null;
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
          onchain_address?: string | null;
          onchain_market_id?: string | null;
          oracle_type?: string | null;
          oracle_request_id?: string | null;
          resolution_tx_hash?: string | null;
          resolution_evidence_hash?: string | null;
          dispute_deadline?: string | null;
          onchain_status?: string | null;
          metadata_hash?: string | null;
          fee_bps?: number | null;
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
          reasoning: string | null;
          created_at: string;
          settled_at: string | null;
          profit: number | null;
          content_hash: string | null;
          ipfs_cid: string | null;
          ipfs_status: string | null;
          chain_id: number | null;
          registry_contract: string | null;
          tx_hash: string | null;
          block_number: number | null;
          anchored_at: string | null;
          onchain_market_address: string | null;
          onchain_outcome_index: number | null;
          onchain_tx_hash: string | null;
          bet_type: string;
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
          reasoning?: string | null;
          created_at?: string;
          settled_at?: string | null;
          profit?: number | null;
          content_hash?: string | null;
          ipfs_cid?: string | null;
          ipfs_status?: string | null;
          chain_id?: number | null;
          registry_contract?: string | null;
          tx_hash?: string | null;
          block_number?: number | null;
          anchored_at?: string | null;
          onchain_market_address?: string | null;
          onchain_outcome_index?: number | null;
          onchain_tx_hash?: string | null;
          bet_type?: string;
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
          reasoning?: string | null;
          created_at?: string;
          settled_at?: string | null;
          profit?: number | null;
          content_hash?: string | null;
          ipfs_cid?: string | null;
          ipfs_status?: string | null;
          chain_id?: number | null;
          registry_contract?: string | null;
          tx_hash?: string | null;
          block_number?: number | null;
          anchored_at?: string | null;
          onchain_market_address?: string | null;
          onchain_outcome_index?: number | null;
          onchain_tx_hash?: string | null;
          bet_type?: string;
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
      wallet_nonces: {
        Row: {
          id: string;
          nonce: string;
          agent_id: string;
          used: boolean;
          created_at: string;
          expires_at: string;
        };
        Insert: {
          id?: string;
          nonce: string;
          agent_id: string;
          used?: boolean;
          created_at?: string;
          expires_at?: string;
        };
        Update: {
          id?: string;
          nonce?: string;
          agent_id?: string;
          used?: boolean;
          created_at?: string;
          expires_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wallet_nonces_agent_id_fkey";
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
