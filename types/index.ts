export type LocationArea = 'Alabang' | 'BGC' | 'Ortigas' | 'Makati - CBD/Ayala' | 'Makati - Poblacion/Rockwell' | 'Makati - San Antonio/Gil Puyat' | 'Makati - Others' | 'Mandaluyong - Ortigas South' | 'Mandaluyong - Greenfield/Shaw' | 'Mandaluyong - Boni/Pioneer' | 'QC - Tomas Morato' | 'QC - Katipunan' | 'QC - Eastwood' | 'QC - Cubao' | 'QC - Fairview/Commonwealth' | 'QC - Novaliches' | 'QC - Diliman' | 'QC - Maginhawa/UP Village';

export interface Studio {
    id: string;
    name: string;
    location: LocationArea;
    reformers_count: number;
    description: string | null;
    bio: string | null;
    hourly_rate: number;
    owner_id: string;
    verified: boolean;
    equipment: string[];
    contact_number?: string;
    address?: string;
    pricing?: Record<string, number>;
    logo_url?: string;
    is_founding_partner?: boolean;
    custom_fee_percentage?: number;
}

export interface Profile {
    id: string;
    full_name: string;
    avatar_url?: string;
    bio?: string;
    role: 'customer' | 'instructor' | 'admin';
    instagram_handle?: string;
    emergency_contact?: string;
    waiver_url?: string;
    teaching_equipment?: string[];
    rates?: Record<string, number>;
    available_balance?: number;
    pending_balance?: number;
    wallet_balance?: number;
    is_founding_partner?: boolean;
    custom_fee_percentage?: number;
}

export interface Slot {
    id: string;
    studio_id: string;
    start_time: string; // ISO string
    end_time: string;   // ISO string
    is_available: boolean;
    equipment?: string[];
    studios?: Studio; // Joined data
}

export type TicketStatus = 'open' | 'resolved';

export interface SupportTicket {
    id: string;
    user_id: string;
    status: TicketStatus;
    created_at: string;
    updated_at: string;
    profiles?: {    // Joined data
        full_name: string;
        role: string;
        studios?: {
            name: string;
        }[];
    };
}

export interface SupportMessage {
    id: string;
    ticket_id: string;
    sender_id: string;
    message: string;
    created_at: string;
    is_read?: boolean;
}
