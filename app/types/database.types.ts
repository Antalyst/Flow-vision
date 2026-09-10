export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          user_id: string
          email: string
          full_name: string | null
          role: string | null
          org_id: string | null
          office_id: string | null
          current_office_id: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          user_id?: string
          email: string
          full_name?: string | null
          role?: string | null
          org_id?: string | null
          office_id?: string | null
          current_office_id?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          user_id?: string
          email?: string
          full_name?: string | null
          role?: string | null
          org_id?: string | null
          office_id?: string | null
          current_office_id?: string | null
          created_at?: string
          updated_at?: string | null
        }
      }
      documents: {
        Row: {
          id: string
          title: string
          description: string | null
          status: string | null
          tracking_status: string | null
          current_step: number | null
          stage_id: string | null
          org_id: string
          user_id: string | null
          origin_office_id: string | null
          current_office_id: string | null
          office_id: string | null
          assigned_messenger_id: string | null
          checkpoint_cleared_step: number | null
          version: string | null
          qr_code_data: string | null
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          status?: string | null
          tracking_status?: string | null
          current_step?: number | null
          stage_id?: string | null
          org_id: string
          user_id?: string | null
          origin_office_id?: string | null
          current_office_id?: string | null
          office_id?: string | null
          assigned_messenger_id?: string | null
          checkpoint_cleared_step?: number | null
          version?: string | null
          qr_code_data?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          status?: string | null
          tracking_status?: string | null
          current_step?: number | null
          stage_id?: string | null
          org_id?: string
          user_id?: string | null
          origin_office_id?: string | null
          current_office_id?: string | null
          office_id?: string | null
          assigned_messenger_id?: string | null
          checkpoint_cleared_step?: number | null
          version?: string | null
          qr_code_data?: string | null
          created_at?: string
        }
      }
      offices: {
        Row: {
          id: string
          name: string
          code: string | null
          org_id: string
          parent_office_id: string | null
          assigned_user: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          code?: string | null
          org_id: string
          parent_office_id?: string | null
          assigned_user?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          code?: string | null
          org_id?: string
          parent_office_id?: string | null
          assigned_user?: string | null
          created_at?: string
        }
      }
      stages: {
        Row: {
          stage_id: string
          name: string
          description: string | null
          org_id: string
          created_at: string
        }
        Insert: {
          stage_id?: string
          name: string
          description?: string | null
          org_id: string
          created_at?: string
        }
        Update: {
          stage_id?: string
          name?: string
          description?: string | null
          org_id?: string
          created_at?: string
        }
      }
      stage_steps: {
        Row: {
          id: string
          stage_id: string
          step_number: number
          office_id: string
          created_at: string
        }
        Insert: {
          id?: string
          stage_id: string
          step_number: number
          office_id: string
          created_at?: string
        }
        Update: {
          id?: string
          stage_id?: string
          step_number?: number
          office_id?: string
          created_at?: string
        }
      }
      [key: string]: {
        Row: Record<string, any>
        Insert: Record<string, any>
        Update: Record<string, any>
      }
    }
    Views: {
      [key: string]: {
        Row: Record<string, any>
      }
    }
    Functions: {
      [key: string]: {
        Args: Record<string, any>
        Returns: any
      }
    }
    Enums: {
      [key: string]: any
    }
  }
}
