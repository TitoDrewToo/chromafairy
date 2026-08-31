export type UserRole = "owner" | "admin" | "staff" | "developer";
export type WorkStatus = "draft" | "available" | "reserved" | "sold";
export type InquiryType = "piece" | "commission";
export type InquiryStatus = "new" | "replied" | "closed";
export type DimensionUnit = "cm" | "in";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type OrderStatus = "new" | "paid" | "packed" | "shipped" | "delivered" | "cancelled";
export type ShipmentStatus = "pending" | "booked" | "in_transit" | "delivered";
export type PackageType = "rolled_tube" | "flat" | "crate";
export type AvailabilityRepeat = "none" | "daily" | "weekly" | "monthly";
export type AppointmentStatus = "requested" | "confirmed" | "completed" | "cancelled" | "no_show";
export type AppointmentMode = "video" | "call" | "in_person";
export type ErrorLevel = "error" | "warn" | "info";
export type ErrorGroupStatus = "new" | "triaged" | "resolved";
export type ReviewVerdict = "matched" | "partial" | "wrong";
export type LandingSectionKey = "collections" | "exhibitions" | "press" | "gallery";
export type LandingItemType = "collection" | "exhibition" | "press_image" | "press_text" | "gallery";
export type LandingMedia = { path: string; alt: string; label: string };
export type LandingSection = {
  id: string;
  section_key: LandingSectionKey;
  eyebrow: string;
  title: string;
  body: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};
export type LandingItem = {
  id: string;
  section_id: string;
  item_type: LandingItemType;
  eyebrow: string;
  title: string;
  subtitle: string;
  body: string;
  source: string;
  link_url: string;
  link_label: string;
  media: LandingMedia[];
  display_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

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
  archived_at: string | null;
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

export type Customer = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type Order = {
  id: string;
  work_id: string | null;
  inquiry_id: string | null;
  customer_id: string | null;
  buyer_name: string | null;
  buyer_email: string | null;
  buyer_phone: string | null;
  amount: number | null;
  currency: string | null;
  payment_status: PaymentStatus | null;
  payment_provider: string | null;
  payment_ref: string | null;
  order_status: OrderStatus | null;
  work_status_before_sale: WorkStatus | null;
  sale_date: string | null;
  channel: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type Shipment = {
  id: string;
  order_id: string | null;
  name: string | null;
  line1: string | null;
  line2: string | null;
  city: string | null;
  region: string | null;
  postal_code: string | null;
  country: string | null;
  phone: string | null;
  carrier: string | null;
  service: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  cost: number | null;
  currency: string | null;
  status: ShipmentStatus | null;
  package_type: PackageType | null;
  created_at: string | null;
  updated_at: string | null;
};

export type FeatureFlag = { key: string; enabled: boolean; notes: string | null; updated_at: string | null };
export type PublicFeatureFlag = Pick<FeatureFlag, "key" | "enabled">;

export type Availability = {
  id: string;
  starts_at: string;
  ends_at: string;
  kind: string | null;
  all_day: boolean | null;
  repeat: AvailabilityRepeat | null;
  repeat_days: number[] | null;
  repeat_until: string | null;
  reason: string | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type Appointment = {
  id: string;
  customer_id: string | null;
  inquiry_id: string | null;
  title: string | null;
  starts_at: string | null;
  ends_at: string | null;
  mode: AppointmentMode | null;
  location: string | null;
  status: AppointmentStatus | null;
  notes: string | null;
  external_calendar: string | null;
  external_event_id: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type ErrorEvent = {
  id: string;
  occurred_at: string;
  occurred_at_manila: string;
  user_id: string | null;
  tool: string;
  fn: string;
  action: string | null;
  route: string | null;
  level: ErrorLevel;
  message: string;
  stack: string | null;
  fingerprint: string;
  context: Record<string, unknown>;
  release: string | null;
  environment: string | null;
};

export type ErrorGroup = {
  fingerprint: string;
  title: string;
  first_seen: string;
  last_seen: string;
  count: number;
  status: ErrorGroupStatus | string;
  ai_analysis: string | null;
  proposed_fix: string | null;
  risk_level: string | null;
  confidence: number | null;
  severity: string | null;
  diagnosed_at: string | null;
  ai_model: string | null;
  review_verdict: ReviewVerdict | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
};

export type StudioNote = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  position: number;
  created_at: string;
  updated_at: string;
};

export type StudioBoardPost = {
  id: string;
  author_id: string;
  body: string;
  created_at: string;
};

export type PageView = {
  id: string;
  path: string;
  referrer: string | null;
  visitor_hash: string;
  created_at: string;
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
        Insert: Omit<Inquiry, "id" | "created_at" | "updated_at" | "status" | "archived_at" | "notified_at"> &
          Partial<Pick<Inquiry, "id" | "created_at" | "updated_at" | "status" | "archived_at" | "notified_at">>;
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
      customers: {
        Row: Customer;
        Insert: Partial<Omit<Customer, "id" | "created_at" | "updated_at">> & Partial<Pick<Customer, "id" | "created_at" | "updated_at">>;
        Update: Partial<Customer>;
        Relationships: [];
      };
      orders: {
        Row: Order;
        Insert: Partial<Omit<Order, "id" | "created_at" | "updated_at">> & Partial<Pick<Order, "id" | "created_at" | "updated_at">>;
        Update: Partial<Order>;
        Relationships: [];
      };
      shipments: {
        Row: Shipment;
        Insert: Partial<Omit<Shipment, "id" | "created_at" | "updated_at">> & Partial<Pick<Shipment, "id" | "created_at" | "updated_at">>;
        Update: Partial<Shipment>;
        Relationships: [];
      };
      feature_flags: {
        Row: FeatureFlag;
        Insert: Partial<Omit<FeatureFlag, "updated_at">> & Partial<Pick<FeatureFlag, "updated_at">>;
        Update: Partial<FeatureFlag>;
        Relationships: [];
      };
      availability: {
        Row: Availability;
        Insert: Partial<Omit<Availability, "id" | "created_at" | "updated_at">> & Partial<Pick<Availability, "id" | "created_at" | "updated_at">>;
        Update: Partial<Availability>;
        Relationships: [];
      };
      appointments: {
        Row: Appointment;
        Insert: Partial<Omit<Appointment, "id" | "created_at" | "updated_at">> & Partial<Pick<Appointment, "id" | "created_at" | "updated_at">>;
        Update: Partial<Appointment>;
        Relationships: [];
      };
      error_events: {
        Row: ErrorEvent;
        Insert: Partial<ErrorEvent>;
        Update: Partial<ErrorEvent>;
        Relationships: [];
      };
      error_groups: {
        Row: ErrorGroup;
        Insert: Partial<ErrorGroup>;
        Update: Partial<ErrorGroup>;
        Relationships: [];
      };
      studio_notes: {
        Row: StudioNote;
        Insert: Partial<Omit<StudioNote, "id" | "created_at" | "updated_at">> &
          Partial<Pick<StudioNote, "id" | "created_at" | "updated_at">>;
        Update: Partial<StudioNote>;
        Relationships: [];
      };
      studio_board: {
        Row: StudioBoardPost;
        Insert: Partial<Omit<StudioBoardPost, "id" | "created_at">> &
          Partial<Pick<StudioBoardPost, "id" | "created_at">>;
        Update: Partial<StudioBoardPost>;
        Relationships: [];
      };
      page_views: {
        Row: PageView;
        Insert: Partial<Omit<PageView, "id" | "created_at">> & Partial<Pick<PageView, "id" | "created_at">>;
        Update: Partial<PageView>;
        Relationships: [];
      };
      landing_sections: {
        Row: LandingSection;
        Insert: Partial<LandingSection>;
        Update: Partial<LandingSection>;
        Relationships: [];
      };
      landing_items: {
        Row: LandingItem;
        Insert: Partial<LandingItem>;
        Update: Partial<LandingItem>;
        Relationships: [];
      };
    };
    Views: {
      public_feature_flags: {
        Row: PublicFeatureFlag;
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      is_owner_or_developer: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      is_user_manager: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      record_sale: {
        Args: {
          p_customer_id: string | null;
          p_customer_name: string;
          p_customer_email: string;
          p_customer_phone: string | null;
          p_work_id: string;
          p_inquiry_id: string | null;
          p_amount: number;
          p_currency: string;
          p_sale_date: string;
          p_channel: string | null;
          p_notes: string | null;
          p_shipment: Record<string, string> | null;
        };
        Returns: { order_id: string; customer_id: string };
      };
      cancel_order: {
        Args: { p_order_id: string };
        Returns: boolean;
      };
      request_public_booking: {
        Args: { p_name: string; p_email: string; p_slot_start: string; p_message: string };
        Returns: string;
      };
      record_error_event: {
        Args: {
          p_occurred_at?: string;
          p_user_id?: string | null;
          p_tool?: string | null;
          p_fn?: string | null;
          p_action?: string | null;
          p_route?: string | null;
          p_level?: ErrorLevel;
          p_message?: string;
          p_stack?: string | null;
          p_fingerprint?: string | null;
          p_context?: Record<string, unknown>;
          p_release?: string | null;
          p_environment?: string | null;
        };
        Returns: ErrorEvent;
      };
      get_traffic_summary: {
        Args: { p_from: string; p_to: string };
        Returns: { total_views: number; unique_visitors_today: number; top_referrer: string | null; tracked_days: number }[];
      };
      get_views_by_period: {
        Args: { p_granularity: string; p_from: string; p_to: string };
        Returns: { period_start: string; views: number; unique_visitors: number | null }[];
      };
      get_top_pages: {
        Args: { p_from: string; p_to: string; p_limit?: number };
        Returns: { path: string; views: number }[];
      };
      get_inquiry_counts_by_period: {
        Args: { p_granularity: string; p_from: string; p_to: string };
        Returns: { period_start: string; inquiries: number }[];
      };
      get_inquiry_total: {
        Args: { p_from: string; p_to: string };
        Returns: number;
      };
    };
    Enums: {
      user_role: UserRole;
      work_status: WorkStatus;
      inquiry_type: InquiryType;
      inquiry_status: InquiryStatus;
      dimension_unit: DimensionUnit;
      payment_status: PaymentStatus;
      order_status: OrderStatus;
      shipment_status: ShipmentStatus;
      package_type: PackageType;
      availability_repeat: AvailabilityRepeat;
      appointment_status: AppointmentStatus;
      appointment_mode: AppointmentMode;
    };
    CompositeTypes: Record<string, never>;
  };
};
