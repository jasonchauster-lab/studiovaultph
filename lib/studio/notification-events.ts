export interface NotificationEvent {
    id: string;
    label: string;
}

export interface NotificationCategory {
    id: string;
    label: string;
    events: NotificationEvent[];
}

export const NOTIFICATION_CATEGORIES: NotificationCategory[] = [
    {
        id: 'onboarding',
        label: 'Onboarding',
        events: [
            { id: 'new_sign_up', label: 'New sign up' }
        ]
    },
    {
        id: 'bookings',
        label: 'Bookings',
        events: [
            { id: 'class_new_booking', label: 'Class new booking' },
            { id: 'class_new_booking_waitlist', label: 'Class new booking auto-added from waitlist' },
            { id: 'class_booking_cancelled', label: 'Class booking cancelled' },
            { id: 'class_booking_late_cancelled', label: 'Class booking late cancelled' },
            { id: 'class_auto_cancelled', label: 'Class auto-cancelled by system' },
            { id: 'class_cancelled_by_staff', label: 'Class cancelled by staff' },
            { id: 'appointment_new_booking', label: 'Appointment new booking' },
            { id: 'appointment_booking_cancelled', label: 'Appointment booking cancelled' },
            { id: 'course_new_booking', label: 'Course new booking' },
            { id: 'course_booking_cancelled', label: 'Course booking cancelled' }
        ]
    },
    {
        id: 'payments',
        label: 'Payments',
        events: [
            { id: 'new_payment_received', label: 'New payment received' },
            { id: 'membership_renewal_received', label: 'Membership renewal payment received' },
            { id: 'overdue_payment_settled', label: 'Overdue payment settled' },
            { id: 'failed_membership_charge', label: 'Failed membership recurring charge' },
            { id: 'updated_credit_card', label: 'Updated credit card' },
            { id: 'payment_proof_uploaded', label: 'Manual payment proof uploaded' },
            { id: 'payment_approved', label: 'Manual payment approved' }
        ]
    },
    {
        id: 'pricing_plan',
        label: 'Pricing Plan',
        events: [
            { id: 'membership_cancelled', label: 'Membership cancelled' }
        ]
    },
    {
        id: 'marketing',
        label: 'Marketing',
        events: [
            { id: 'email_reach_75', label: 'Monthly email reach 75% of the usage limit' },
            { id: 'email_reach_100', label: 'Monthly email reach 100% of the usage limit' },
            { id: 'whatsapp_reach_75', label: 'Monthly WhatsApp reach 75% of the usage limit' },
            { id: 'whatsapp_reach_100', label: 'Monthly WhatsApp reach 100% of the usage limit' },
            { id: 'campaign_stopped_quota', label: 'Campaign stopped – Insufficient Quota' },
            { id: 'campaign_stopped_overdue', label: 'Campaign stopped – Overdue subscription' }
        ]
    }
];

export const CHANNELS = [
    { id: 'email', label: 'Email' },
    { id: 'in_app', label: 'In-app' }
];
