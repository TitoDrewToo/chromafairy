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
