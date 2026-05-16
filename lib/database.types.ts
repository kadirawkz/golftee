export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      locations: {
        Row: {
          id: string;
          city_name: string;
          region_name: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          city_name: string;
          region_name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          city_name?: string;
          region_name?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      course_styles: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      membership_tiers: {
        Row: {
          id: string;
          name: string;
          discount_percent: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          discount_percent?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          discount_percent?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      favorite_courses: {
        Row: {
          course_id: string;
          created_at: string;
          user_id: string;
        };
        Insert: {
          course_id: string;
          created_at?: string;
          user_id: string;
        };
        Update: {
          course_id?: string;
          created_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "favorite_courses_course_id_fkey"
            columns: ["course_id"]
            referencedRelation: "golf_courses"
            referencedColumns: ["id"]
          }
        ];
      };
      golf_courses: {
        Row: {
          id: string;
          image: string;
          is_active: boolean;
          latitude: number;
          location_id: string;
          longitude: number;
          place_id: string | null;
          place_query: string;
          price: number;
          rating: number;
          sort_order: number;
          style_id: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          image: string;
          is_active?: boolean;
          latitude: number;
          location_id: string;
          longitude: number;
          place_id?: string | null;
          place_query: string;
          price: number;
          rating: number;
          sort_order?: number;
          style_id: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          image?: string;
          is_active?: boolean;
          latitude?: number;
          location_id?: string;
          longitude?: number;
          place_id?: string | null;
          place_query?: string;
          price?: number;
          rating?: number;
          sort_order?: number;
          style_id?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "golf_courses_location_id_fkey"
            columns: ["location_id"]
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "golf_courses_style_id_fkey"
            columns: ["style_id"]
            referencedRelation: "course_styles"
            referencedColumns: ["id"]
          }
        ];
      };
      course_tee_slot_templates: {
        Row: {
          course_id: string;
          created_at: string;
          id: string;
          is_active: boolean;
          max_players: number;
          sort_order: number;
          tee_time: string;
          time_period: string;
          updated_at: string;
        };
        Insert: {
          course_id: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          max_players?: number;
          sort_order?: number;
          tee_time: string;
          time_period: string;
          updated_at?: string;
        };
        Update: {
          course_id?: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          max_players?: number;
          sort_order?: number;
          tee_time?: string;
          time_period?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      course_content: {
        Row: {
          course_id: string;
          created_at: string;
          experience_description: string;
          hero_badge: string;
          review_count: number;
          updated_at: string;
        };
        Insert: {
          course_id: string;
          created_at?: string;
          experience_description: string;
          hero_badge?: string;
          review_count?: number;
          updated_at?: string;
        };
        Update: {
          course_id?: string;
          created_at?: string;
          experience_description?: string;
          hero_badge?: string;
          review_count?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      course_detail_items: {
        Row: {
          category: string;
          course_id: string;
          created_at: string;
          icon: string;
          id: string;
          is_active: boolean;
          sort_order: number;
          subtitle: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          category: string;
          course_id: string;
          created_at?: string;
          icon: string;
          id?: string;
          is_active?: boolean;
          sort_order?: number;
          subtitle: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          category?: string;
          course_id?: string;
          created_at?: string;
          icon?: string;
          id?: string;
          is_active?: boolean;
          sort_order?: number;
          subtitle?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      course_reviews: {
        Row: {
          author_badge: string;
          author_name: string;
          course_id: string;
          created_at: string;
          id: string;
          is_published: boolean;
          rating: number;
          review_date: string;
          review_text: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          author_badge: string;
          author_name: string;
          course_id: string;
          created_at?: string;
          id?: string;
          is_published?: boolean;
          rating: number;
          review_date: string;
          review_text: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          author_badge?: string;
          author_name?: string;
          course_id?: string;
          created_at?: string;
          id?: string;
          is_published?: boolean;
          rating?: number;
          review_date?: string;
          review_text?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      tee_time_bookings: {
        Row: {
          booking_code: string;
          canceled_at: string | null;
          caddy_fee: number;
          course_id: string;
          created_at: string;
          green_fee: number;
          id: string;
          payment_method: string;
          players: number;
          service_fee: number;
          status: string;
          taxes: number;
          tee_date: string;
          tee_time: string;
          time_period: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          booking_code?: string;
          canceled_at?: string | null;
          caddy_fee: number;
          course_id: string;
          created_at?: string;
          green_fee: number;
          id?: string;
          payment_method?: string;
          players: number;
          service_fee: number;
          status?: string;
          taxes: number;
          tee_date: string;
          tee_time: string;
          time_period: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          booking_code?: string;
          canceled_at?: string | null;
          caddy_fee?: number;
          course_id?: string;
          created_at?: string;
          green_fee?: number;
          id?: string;
          payment_method?: string;
          players?: number;
          service_fee?: number;
          status?: string;
          taxes?: number;
          tee_date?: string;
          tee_time?: string;
          time_period?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tee_time_bookings_course_id_fkey"
            columns: ["course_id"]
            referencedRelation: "golf_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tee_time_bookings_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          full_name: string | null;
          handicap: number | null;
          home_club_id: string | null;
          id: string;
          member_since: string;
          tier_id: string;
          phone: string | null;
          updated_at: string;
          username: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          full_name?: string | null;
          handicap?: number | null;
          home_club_id?: string | null;
          id: string;
          member_since?: string;
          tier_id: string;
          phone?: string | null;
          updated_at?: string;
          username?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          full_name?: string | null;
          handicap?: number | null;
          home_club_id?: string | null;
          id?: string;
          member_since?: string;
          tier_id?: string;
          phone?: string | null;
          updated_at?: string;
          username?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_home_club_id_fkey"
            columns: ["home_club_id"]
            referencedRelation: "golf_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_tier_id_fkey"
            columns: ["tier_id"]
            referencedRelation: "membership_tiers"
            referencedColumns: ["id"]
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      cancel_tee_time_booking: {
        Args: {
          target_booking_id: string;
        };
        Returns: Database["public"]["Tables"]["tee_time_bookings"]["Row"];
      };
      get_available_tee_slots: {
        Args: {
          target_course_id: string;
          target_tee_date: string;
        };
        Returns: {
          is_available: boolean;
          is_past: boolean;
          max_players: number;
          tee_time: string;
          time_period: string;
        }[];
      };
      get_next_bookable_tee_slot: {
        Args: {
          target_course_id: string;
          target_start_date?: string | null;
        };
        Returns: {
          max_players: number;
          tee_date: string;
          tee_time: string;
          time_period: string;
        }[];
      };
      save_tee_time_booking: {
        Args: {
          target_booking_id?: string | null;
          target_course_id?: string | null;
          target_payment_method?: string | null;
          target_players?: number | null;
          target_tee_date?: string | null;
          target_tee_time?: string | null;
          target_time_period?: string | null;
        };
        Returns: Database["public"]["Tables"]["tee_time_bookings"]["Row"];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];
export type FavoriteCourseRow = Database["public"]["Tables"]["favorite_courses"]["Row"];
export type FavoriteCourseInsert = Database["public"]["Tables"]["favorite_courses"]["Insert"];
export type GolfCourseRow = Database["public"]["Tables"]["golf_courses"]["Row"];
export type CourseTeeSlotTemplateRow = Database["public"]["Tables"]["course_tee_slot_templates"]["Row"];
export type CourseContentRow = Database["public"]["Tables"]["course_content"]["Row"];
export type CourseDetailItemRow = Database["public"]["Tables"]["course_detail_items"]["Row"];
export type CourseReviewRow = Database["public"]["Tables"]["course_reviews"]["Row"];
export type TeeTimeBookingRow = Database["public"]["Tables"]["tee_time_bookings"]["Row"];
export type TeeTimeBookingInsert = Database["public"]["Tables"]["tee_time_bookings"]["Insert"];
export type TeeTimeBookingUpdate = Database["public"]["Tables"]["tee_time_bookings"]["Update"];
