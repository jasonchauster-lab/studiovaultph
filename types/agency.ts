export interface Studio {
    id: string
    name: string
    slug: string
    owner_id: string
    logo_url?: string
    banner_url?: string
    bio?: string
    whatsapp_number?: string
    show_whatsapp_button?: boolean
    address?: string
    website_config?: any
    subscription_tier?: 'free' | 'pro'
    subscription_status?: 'active' | 'inactive' | 'trialing' | 'past_due' | 'canceled'
    custom_domain?: string
}

export interface Membership {
    id: string
    studio_id: string
    name: string
    description?: string
    price: number
    validity_days: number
    credits?: number | null // null = unlimited
    is_private: boolean
    category_id?: string
    category?: string
    applicable_service_ids: string[]
    applicable_outlet_ids?: string[] | null
    features?: string[]
    is_deleted: boolean
    created_at: string
}

export interface Package {
    id: string
    studio_id: string
    name: string
    description?: string
    price: number
    credits: number
    validity_days: number
    validity_value?: number
    validity_unit?: 'days' | 'weeks' | 'months'
    is_private: boolean
    category_id?: string
    category?: string
    applicable_service_ids: string[]
    applicable_outlet_ids?: string[] | null
    location_access_type?: 'admin_selected' | 'customer_selected'
    restriction_type?: 'all' | 'new_clients'
    activation_type?: 'purchase' | 'first_booking'
    is_deleted: boolean
    created_at: string
}

export interface Service {
    id: string
    studio_id: string
    name: string
    description?: string
    duration_minutes: number
    is_deleted: boolean
}

export interface ServiceCategory {
    id: string
    studio_id: string
    name: string
    type: 'membership' | 'package' | 'service'
    display_order: number
    is_deleted: boolean
}

export interface Outlet {
    id: string
    studio_id: string
    name: string
    slug: string
    address?: string
    status: 'published' | 'draft'
    is_active: boolean
}

export type PricingItem = Membership | Package;

export interface PricingCategory extends ServiceCategory {
    // We can add specific fields for the UI if needed
}

export interface InventoryItem {
    id: string
    studio_id: string
    name: string
    description?: string
    sku?: string
    category?: string
    price: number
    stock_level: number
    low_stock_threshold: number
    is_deleted: boolean
    created_at: string
    updated_at: string
}

export interface Instructor {
    id: string
    studio_id: string
    full_name: string
    bio?: string
    photo_url?: string
    is_active: boolean
}

export interface Booking {
    id: string
    slot_id: string
    user_id: string
    status: 'pending' | 'approved' | 'canceled' | 'completed' | 'no_show'
    equipment?: string
    instructor?: Instructor
    client?: {
        id: string
        full_name: string
        email: string
    }
    price_breakdown?: any
    created_at: string
}

export interface ScheduleSlot {
    id: string
    studio_id: string
    outlet_id: string
    date: string 
    start_time: string 
    end_time: string 
    instructor_id?: string
    instructor?: Instructor
    quantity: number
    equipment?: Record<string, number>
    is_deleted: boolean
    bookings?: Booking[]
    color?: string
    calendar_color?: string
}

export type LeadStatus = 'new' | 'contacted' | 'trial' | 'active' | 'lost'

export interface ClientNote {
    id: string
    client_id: string
    author_id: string
    content: string
    created_at: string
}

export interface ClientProfile {
    id: string
    studio_id: string
    full_name: string
    email: string
    phone?: string
    avatar_url?: string
    status: LeadStatus
    joined_date: string
    last_visit?: string
    total_bookings: number
    referral_count: number
    notes?: ClientNote[]
    tags?: string[]
}
