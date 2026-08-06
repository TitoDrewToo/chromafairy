export type UserRole = "owner" | "admin" | "staff" | "developer";
export type WorkStatus = "draft" | "available" | "reserved" | "sold";
export type InquiryType = "piece" | "commission";
export type InquiryStatus = "new" | "replied" | "closed";
export type DimensionUnit = "cm" | "in";

export type Work = {
  id: string;
  title: string;
  slug: string;
  year: number;
  series_id: string | null;
  month: number | null;
  medium: string | null;
  width: number | null;
  height: number | null;
  depth: number | null;
  dimension_unit: DimensionUnit | null;
  description: string | null;
  price_php: number | null;
  price_usd: number | null;
  price_on_request: boolean | null;
  status: WorkStatus;
  is_new: boolean | null;
  is_featured: boolean | null;
  primary_image: string | null;
  display_order: number | null;
  packed_weight_kg: number | null;
  packed_l: number | null;
  packed_w: number | null;
  packed_h: number | null;
  ship_rolled: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  sold_at: string | null;
};

export type Series = {
  id: string;
  name: string;
  slug: string;
  year: number | null;
  description: string | null;
  cover_image: string | null;
  display_order: number | null;
  is_published: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

export type WorkImage = {
  id: string;
  work_id: string;
  storage_path: string;
  alt: string | null;
  display_order: number | null;
  is_primary: boolean | null;
  created_at: string | null;
};

export type Inquiry = {
  id: string;
  type: InquiryType;
  work_id: string | null;
  work_title_snapshot: string | null;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  size_pref: string | null;
  palette_pref: string | null;
  space_for: string | null;
  budget_range: string | null;
  timeline: string | null;
  source: string | null;
  status: InquiryStatus;
  notified_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: UserRole;
  created_at: string | null;
  updated_at: string | null;
};

export type Database = {
  public: {
    Tables: {
      works: {
        Row: Work;
        Insert: Partial<Omit<Work, "id" | "created_at" | "updated_at" | "sold_at">> &
          Pick<Work, "title" | "slug" | "year"> &
          Partial<Pick<Work, "id" | "created_at" | "updated_at" | "sold_at">>;
        Update: Partial<Work>;
        Relationships: [];
      };
      series: {
        Row: Series;
        Insert: Partial<Omit<Series, "id" | "created_at" | "updated_at">> &
          Pick<Series, "name" | "slug"> &
          Partial<Pick<Series, "id" | "created_at" | "updated_at">>;
        Update: Partial<Series>;
        Relationships: [];
      };
      work_images: {
        Row: WorkImage;
        Insert: Omit<WorkImage, "id" | "created_at"> & Partial<Pick<WorkImage, "id" | "created_at">>;
        Update: Partial<WorkImage>;
        Relationships: [];
      };
      inquiries: {
        Row: Inquiry;
        Insert: Omit<Inquiry, "id" | "created_at" | "updated_at" | "status" | "notified_at"> &
          Partial<Pick<Inquiry, "id" | "created_at" | "updated_at" | "status" | "notified_at">>;
        Update: Partial<Inquiry>;
        Relationships: [];
      };
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "created_at" | "updated_at" | "role"> &
          Partial<Pick<Profile, "created_at" | "updated_at" | "role">>;
        Update: Partial<Profile>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
    Enums: {
      user_role: UserRole;
      work_status: WorkStatus;
      inquiry_type: InquiryType;
      inquiry_status: InquiryStatus;
      dimension_unit: DimensionUnit;
    };
    CompositeTypes: Record<string, never>;
  };
};
