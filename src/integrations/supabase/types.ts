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
      daily_activity: {
        Row: {
          created_at: string
          day: string
          id: string
          minutes: number
          topics_completed: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day?: string
          id?: string
          minutes?: number
          topics_completed?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day?: string
          id?: string
          minutes?: number
          topics_completed?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          category: string | null
          created_at: string
          deadline: string | null
          description: string | null
          id: string
          is_active: boolean
          learning_style: string | null
          level: string
          minutes_per_day: number
          status: string
          title: string
          updated_at: string
          user_id: string
          time_slot_preference: string | null
          syllabus_text: string | null
          source_materials: Json | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          learning_style?: string | null
          level?: string
          minutes_per_day?: number
          status?: string
          title: string
          updated_at?: string
          user_id: string
          time_slot_preference?: string | null
          syllabus_text?: string | null
          source_materials?: Json | null
        }
        Update: {
          category?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          learning_style?: string | null
          level?: string
          minutes_per_day?: number
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          time_slot_preference?: string | null
          syllabus_text?: string | null
          source_materials?: Json | null
        }
        Relationships: []
      }
      notes: {
        Row: {
          content: string
          ai_summary: string | null
          created_at: string
          id: string
          topic_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          ai_summary?: string | null
          created_at?: string
          id?: string
          topic_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          ai_summary?: string | null
          created_at?: string
          id?: string
          topic_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "roadmap_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          id: string
          instructor_id: string
          title: string
          degree_program: string | null
          semester: string | null
          category: string | null
          description: string | null
          level: string | null
          thumbnail_url: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          instructor_id: string
          title: string
          degree_program?: string | null
          semester?: string | null
          category?: string | null
          description?: string | null
          level?: string | null
          thumbnail_url?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          instructor_id?: string
          title?: string
          degree_program?: string | null
          semester?: string | null
          category?: string | null
          description?: string | null
          level?: string | null
          thumbnail_url?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      course_enrollments: {
        Row: {
          id: string
          user_id: string
          course_id: string
          progress_pct: number
          enrolled_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          course_id: string
          progress_pct?: number
          enrolled_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          course_id?: string
          progress_pct?: number
          enrolled_at?: string
          completed_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          onboarding_complete: boolean
          role: "student" | "instructor" | "admin" | null
          updated_at: string
          institution_name: string | null
          academic_title: string | null
          specialization: string | null
          teaching_experience_years: number | null
          bio: string | null
          portfolio_url: string | null
          is_verified_instructor: boolean | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          onboarding_complete?: boolean
          role?: "student" | "instructor" | "admin" | null
          updated_at?: string
          institution_name?: string | null
          academic_title?: string | null
          specialization?: string | null
          teaching_experience_years?: number | null
          bio?: string | null
          portfolio_url?: string | null
          is_verified_instructor?: boolean | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          onboarding_complete?: boolean
          role?: "student" | "instructor" | "admin" | null
          updated_at?: string
          institution_name?: string | null
          academic_title?: string | null
          specialization?: string | null
          teaching_experience_years?: number | null
          bio?: string | null
          portfolio_url?: string | null
          is_verified_instructor?: boolean | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          key: string
          value: string
          updated_at: string
        }
        Insert: {
          key: string
          value: string
          updated_at?: string
        }
        Update: {
          key?: string
          value?: string
          updated_at?: string
        }
        Relationships: []
      }
      roadmap_modules: {
        Row: {
          course_id: string | null
          created_at: string
          description: string | null
          estimated_minutes: number
          goal_id: string
          id: string
          ordinal: number
          status: string
          title: string
          user_id: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          description?: string | null
          estimated_minutes?: number
          goal_id: string
          id?: string
          ordinal: number
          status?: string
          title: string
          user_id: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          description?: string | null
          estimated_minutes?: number
          goal_id?: string
          id?: string
          ordinal?: number
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roadmap_modules_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      roadmap_topics: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          estimated_minutes: number
          goal_id: string
          id: string
          key_concepts: Json
          module_id: string
          ordinal: number
          resources: Json
          status: string
          title: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          estimated_minutes?: number
          goal_id: string
          id?: string
          key_concepts?: Json
          module_id: string
          ordinal: number
          resources?: Json
          status?: string
          title: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          estimated_minutes?: number
          goal_id?: string
          id?: string
          key_concepts?: Json
          module_id?: string
          ordinal?: number
          resources?: Json
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roadmap_topics_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roadmap_topics_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "roadmap_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_missions: {
        Row: {
          completed_minutes: number
          created_at: string
          goal_id: string | null
          id: string
          is_completed: boolean
          mission_date: string
          target_minutes: number
          tasks: Json
          title: string
          topic_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_minutes?: number
          created_at?: string
          goal_id?: string | null
          id?: string
          is_completed?: boolean
          mission_date?: string
          target_minutes?: number
          tasks?: Json
          title: string
          topic_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_minutes?: number
          created_at?: string
          goal_id?: string | null
          id?: string
          is_completed?: boolean
          mission_date?: string
          target_minutes?: number
          tasks?: Json
          title?: string
          topic_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      flashcards: {
        Row: {
          back: string
          box: number
          created_at: string
          front: string
          id: string
          next_review_at: string
          topic_id: string | null
          user_id: string
        }
        Insert: {
          back: string
          box?: number
          created_at?: string
          front: string
          id?: string
          next_review_at?: string
          topic_id?: string | null
          user_id: string
        }
        Update: {
          back?: string
          box?: number
          created_at?: string
          front?: string
          id?: string
          next_review_at?: string
          topic_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      quizzes: {
        Row: {
          created_at: string
          id: string
          questions: Json
          title: string
          topic_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          questions?: Json
          title: string
          topic_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          questions?: Json
          title?: string
          topic_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          completed_at: string
          id: string
          quiz_id: string
          score_percentage: number
          user_answers: Json
          user_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          quiz_id: string
          score_percentage?: number
          user_answers?: Json
          user_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          quiz_id?: string
          score_percentage?: number
          user_answers?: Json
          user_id?: string
        }
        Relationships: []
      }
      study_sessions: {
        Row: {
          ended_at: string | null
          goal_id: string | null
          id: string
          minutes: number
          started_at: string
          topic_id: string | null
          user_id: string
        }
        Insert: {
          ended_at?: string | null
          goal_id?: string | null
          id?: string
          minutes?: number
          started_at?: string
          topic_id?: string | null
          user_id: string
        }
        Update: {
          ended_at?: string | null
          goal_id?: string | null
          id?: string
          minutes?: number
          started_at?: string
          topic_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_sessions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_sessions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "roadmap_topics"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
