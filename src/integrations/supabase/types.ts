export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string;
          actor_email: string | null;
          actor_id: string | null;
          created_at: string;
          details: Json;
          id: string;
          target_user_id: string | null;
        };
        Insert: {
          action: string;
          actor_email?: string | null;
          actor_id?: string | null;
          created_at?: string;
          details: Json;
          id?: string;
          target_user_id?: string | null;
        };
        Update: {
          action?: string;
          actor_email?: string | null;
          actor_id?: string | null;
          created_at?: string;
          details?: Json;
          id?: string;
          target_user_id?: string | null;
        };
        Relationships: [];
      };
      ai_tutor_logs: {
        Row: {
          ai_answer: string | null;
          course_id: string | null;
          created_at: string;
          id: string;
          topic_id: string | null;
          user_id: string;
          user_question: string;
        };
        Insert: {
          ai_answer?: string | null;
          course_id?: string | null;
          created_at?: string;
          id?: string;
          topic_id?: string | null;
          user_id: string;
          user_question: string;
        };
        Update: {
          ai_answer?: string | null;
          course_id?: string | null;
          created_at?: string;
          id?: string;
          topic_id?: string | null;
          user_id?: string;
          user_question?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_tutor_logs_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_tutor_logs_topic_id_fkey";
            columns: ["topic_id"];
            isOneToOne: false;
            referencedRelation: "roadmap_topics";
            referencedColumns: ["id"];
          },
        ];
      };
      course_enrollments: {
        Row: {
          completed_at: string | null;
          course_id: string;
          enrolled_at: string;
          id: string;
          progress_pct: number | null;
          user_id: string;
        };
        Insert: {
          completed_at?: string | null;
          course_id: string;
          enrolled_at?: string;
          id?: string;
          progress_pct?: number | null;
          user_id: string;
        };
        Update: {
          completed_at?: string | null;
          course_id?: string;
          enrolled_at?: string;
          id?: string;
          progress_pct?: number | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "course_enrollments_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
      courses: {
        Row: {
          category: string | null;
          created_at: string;
          degree_program: string | null;
          description: string | null;
          id: string;
          instructor_id: string;
          level: string | null;
          semester: string | null;
          status: string | null;
          thumbnail_url: string | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          category?: string | null;
          created_at?: string;
          degree_program?: string | null;
          description?: string | null;
          id?: string;
          instructor_id: string;
          level?: string | null;
          semester?: string | null;
          status?: string | null;
          thumbnail_url?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          category?: string | null;
          created_at?: string;
          degree_program?: string | null;
          description?: string | null;
          id?: string;
          instructor_id?: string;
          level?: string | null;
          semester?: string | null;
          status?: string | null;
          thumbnail_url?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      daily_activity: {
        Row: {
          created_at: string;
          day: string;
          id: string;
          minutes: number;
          topics_completed: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          day?: string;
          id?: string;
          minutes?: number;
          topics_completed?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          day?: string;
          id?: string;
          minutes?: number;
          topics_completed?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      daily_missions: {
        Row: {
          completed_minutes: number;
          created_at: string;
          goal_id: string | null;
          id: string;
          is_completed: boolean;
          mission_date: string;
          target_minutes: number;
          tasks: Json;
          title: string;
          topic_id: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          completed_minutes?: number;
          created_at?: string;
          goal_id?: string | null;
          id?: string;
          is_completed?: boolean;
          mission_date?: string;
          target_minutes?: number;
          tasks: Json;
          title: string;
          topic_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          completed_minutes?: number;
          created_at?: string;
          goal_id?: string | null;
          id?: string;
          is_completed?: boolean;
          mission_date?: string;
          target_minutes?: number;
          tasks?: Json;
          title?: string;
          topic_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "daily_missions_goal_id_fkey";
            columns: ["goal_id"];
            isOneToOne: false;
            referencedRelation: "goals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "daily_missions_topic_id_fkey";
            columns: ["topic_id"];
            isOneToOne: false;
            referencedRelation: "roadmap_topics";
            referencedColumns: ["id"];
          },
        ];
      };
      document_chunks: {
        Row: {
          chunk_index: number | null;
          content: string;
          course_id: string | null;
          created_at: string;
          document_name: string;
          embedded_at: string | null;
          embedding: string | null;
          embedding_model: string | null;
          goal_id: string | null;
          id: string;
          page_number: number | null;
          topic_id: string | null;
          user_id: string;
        };
        Insert: {
          chunk_index?: number | null;
          content: string;
          course_id?: string | null;
          created_at?: string;
          document_name: string;
          embedded_at?: string | null;
          embedding?: string | null;
          embedding_model?: string | null;
          goal_id?: string | null;
          id?: string;
          page_number?: number | null;
          topic_id?: string | null;
          user_id: string;
        };
        Update: {
          chunk_index?: number | null;
          content?: string;
          course_id?: string | null;
          created_at?: string;
          document_name?: string;
          embedded_at?: string | null;
          embedding?: string | null;
          embedding_model?: string | null;
          goal_id?: string | null;
          id?: string;
          page_number?: number | null;
          topic_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "document_chunks_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "document_chunks_goal_id_fkey";
            columns: ["goal_id"];
            isOneToOne: false;
            referencedRelation: "goals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "document_chunks_topic_id_fkey";
            columns: ["topic_id"];
            isOneToOne: false;
            referencedRelation: "roadmap_topics";
            referencedColumns: ["id"];
          },
        ];
      };
      flashcards: {
        Row: {
          back: string;
          box: number;
          created_at: string;
          ease: number;
          front: string;
          id: string;
          lapses: number;
          last_reviewed_at: string | null;
          next_review_at: string;
          review_count: number;
          topic_id: string | null;
          user_id: string;
        };
        Insert: {
          back: string;
          box?: number;
          created_at?: string;
          ease?: number;
          front: string;
          id?: string;
          lapses?: number;
          last_reviewed_at?: string | null;
          next_review_at?: string;
          review_count?: number;
          topic_id?: string | null;
          user_id: string;
        };
        Update: {
          back?: string;
          box?: number;
          created_at?: string;
          ease?: number;
          front?: string;
          id?: string;
          lapses?: number;
          last_reviewed_at?: string | null;
          next_review_at?: string;
          review_count?: number;
          topic_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "flashcards_topic_id_fkey";
            columns: ["topic_id"];
            isOneToOne: false;
            referencedRelation: "roadmap_topics";
            referencedColumns: ["id"];
          },
        ];
      };
      goals: {
        Row: {
          category: string | null;
          created_at: string;
          deadline: string | null;
          description: string | null;
          id: string;
          is_active: boolean;
          learning_style: string | null;
          level: string;
          minutes_per_day: number;
          source_materials: Json | null;
          status: string;
          syllabus_text: string | null;
          time_slot_preference: string | null;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          category?: string | null;
          created_at?: string;
          deadline?: string | null;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          learning_style?: string | null;
          level?: string;
          minutes_per_day?: number;
          source_materials?: Json | null;
          status?: string;
          syllabus_text?: string | null;
          time_slot_preference?: string | null;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          category?: string | null;
          created_at?: string;
          deadline?: string | null;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          learning_style?: string | null;
          level?: string;
          minutes_per_day?: number;
          source_materials?: Json | null;
          status?: string;
          syllabus_text?: string | null;
          time_slot_preference?: string | null;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      notes: {
        Row: {
          ai_summary: string | null;
          content: string;
          created_at: string;
          id: string;
          topic_id: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          ai_summary?: string | null;
          content?: string;
          created_at?: string;
          id?: string;
          topic_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          ai_summary?: string | null;
          content?: string;
          created_at?: string;
          id?: string;
          topic_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notes_topic_id_fkey";
            columns: ["topic_id"];
            isOneToOne: false;
            referencedRelation: "roadmap_topics";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          academic_title: string | null;
          avatar_url: string | null;
          bio: string | null;
          created_at: string;
          current_streak: number;
          full_name: string | null;
          id: string;
          institution_name: string | null;
          is_verified_instructor: boolean | null;
          level: number;
          longest_streak: number;
          onboarding_complete: boolean;
          portfolio_url: string | null;
          preferred_learning_style: string | null;
          role: "student" | "instructor" | "admin" | null;
          specialization: string | null;
          target_exam: string | null;
          teaching_experience_years: number | null;
          updated_at: string;
          xp: number;
        };
        Insert: {
          academic_title?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          current_streak?: number;
          full_name?: string | null;
          id: string;
          institution_name?: string | null;
          is_verified_instructor?: boolean | null;
          level?: number;
          longest_streak?: number;
          onboarding_complete?: boolean;
          portfolio_url?: string | null;
          preferred_learning_style?: string | null;
          role?: "student" | "instructor" | "admin" | null;
          specialization?: string | null;
          target_exam?: string | null;
          teaching_experience_years?: number | null;
          updated_at?: string;
          xp?: number;
        };
        Update: {
          academic_title?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          current_streak?: number;
          full_name?: string | null;
          id?: string;
          institution_name?: string | null;
          is_verified_instructor?: boolean | null;
          level?: number;
          longest_streak?: number;
          onboarding_complete?: boolean;
          portfolio_url?: string | null;
          preferred_learning_style?: string | null;
          role?: "student" | "instructor" | "admin" | null;
          specialization?: string | null;
          target_exam?: string | null;
          teaching_experience_years?: number | null;
          updated_at?: string;
          xp?: number;
        };
        Relationships: [];
      };
      quiz_attempts: {
        Row: {
          completed_at: string;
          id: string;
          quiz_id: string;
          score_percentage: number;
          user_answers: Json;
          user_id: string;
        };
        Insert: {
          completed_at?: string;
          id?: string;
          quiz_id: string;
          score_percentage?: number;
          user_answers: Json;
          user_id: string;
        };
        Update: {
          completed_at?: string;
          id?: string;
          quiz_id?: string;
          score_percentage?: number;
          user_answers?: Json;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey";
            columns: ["quiz_id"];
            isOneToOne: false;
            referencedRelation: "quizzes";
            referencedColumns: ["id"];
          },
        ];
      };
      quizzes: {
        Row: {
          created_at: string;
          id: string;
          questions: Json;
          title: string;
          topic_id: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          questions: Json;
          title: string;
          topic_id?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          questions?: Json;
          title?: string;
          topic_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quizzes_topic_id_fkey";
            columns: ["topic_id"];
            isOneToOne: false;
            referencedRelation: "roadmap_topics";
            referencedColumns: ["id"];
          },
        ];
      };
      roadmap_modules: {
        Row: {
          course_id: string | null;
          created_at: string;
          description: string | null;
          estimated_minutes: number;
          goal_id: string;
          id: string;
          ordinal: number;
          status: string;
          title: string;
          user_id: string;
        };
        Insert: {
          course_id?: string | null;
          created_at?: string;
          description?: string | null;
          estimated_minutes?: number;
          goal_id: string;
          id?: string;
          ordinal: number;
          status?: string;
          title: string;
          user_id: string;
        };
        Update: {
          course_id?: string | null;
          created_at?: string;
          description?: string | null;
          estimated_minutes?: number;
          goal_id?: string;
          id?: string;
          ordinal?: number;
          status?: string;
          title?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "roadmap_modules_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "roadmap_modules_goal_id_fkey";
            columns: ["goal_id"];
            isOneToOne: false;
            referencedRelation: "goals";
            referencedColumns: ["id"];
          },
        ];
      };
      roadmap_topics: {
        Row: {
          completed_at: string | null;
          created_at: string;
          description: string | null;
          estimated_minutes: number;
          goal_id: string;
          id: string;
          is_weak: boolean;
          key_concepts: Json;
          module_id: string;
          ordinal: number;
          resources: Json;
          status: string;
          title: string;
          user_id: string;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          description?: string | null;
          estimated_minutes?: number;
          goal_id: string;
          id?: string;
          is_weak?: boolean;
          key_concepts: Json;
          module_id: string;
          ordinal: number;
          resources: Json;
          status?: string;
          title: string;
          user_id: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          description?: string | null;
          estimated_minutes?: number;
          goal_id?: string;
          id?: string;
          is_weak?: boolean;
          key_concepts?: Json;
          module_id?: string;
          ordinal?: number;
          resources?: Json;
          status?: string;
          title?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "roadmap_topics_goal_id_fkey";
            columns: ["goal_id"];
            isOneToOne: false;
            referencedRelation: "goals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "roadmap_topics_module_id_fkey";
            columns: ["module_id"];
            isOneToOne: false;
            referencedRelation: "roadmap_modules";
            referencedColumns: ["id"];
          },
        ];
      };
      study_sessions: {
        Row: {
          ended_at: string | null;
          goal_id: string | null;
          id: string;
          minutes: number;
          pauses_count: number;
          started_at: string;
          topic_id: string | null;
          user_id: string;
        };
        Insert: {
          ended_at?: string | null;
          goal_id?: string | null;
          id?: string;
          minutes?: number;
          pauses_count?: number;
          started_at?: string;
          topic_id?: string | null;
          user_id: string;
        };
        Update: {
          ended_at?: string | null;
          goal_id?: string | null;
          id?: string;
          minutes?: number;
          pauses_count?: number;
          started_at?: string;
          topic_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "study_sessions_goal_id_fkey";
            columns: ["goal_id"];
            isOneToOne: false;
            referencedRelation: "goals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "study_sessions_topic_id_fkey";
            columns: ["topic_id"];
            isOneToOne: false;
            referencedRelation: "roadmap_topics";
            referencedColumns: ["id"];
          },
        ];
      };
      system_settings: {
        Row: {
          key: string;
          updated_at: string;
          value: string;
        };
        Insert: {
          key: string;
          updated_at?: string;
          value: string;
        };
        Update: {
          key?: string;
          updated_at?: string;
          value?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_platform_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      is_verified_instructor: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      match_document_chunks: {
        Args: {
          match_count: number;
          match_threshold: number;
          p_topic_id?: string;
          p_user_id: string;
          query_embedding: string;
        };
        Returns: {
          id: string;
          document_name: string;
          page_number: number;
          content: string;
          similarity: number;
        }[];
      };
      owns_course: {
        Args: {
          target_course_id: string;
        };
        Returns: boolean;
      };
      platform_admin_count: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      teaches_student: {
        Args: {
          target_user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
