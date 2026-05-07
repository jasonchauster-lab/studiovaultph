import { z } from 'zod'

/**
 * Zod Schemas for JSONB Columns
 * Ensures type safety and validation for structured database data.
 */

export const EquipmentInventorySchema = z.record(
    z.string(), // Equipment Name (Uppercase)
    z.object({
        total: z.number().default(0),
        active: z.number().default(0)
    })
)

export const SlotEquipmentSchema = z.record(
    z.string(), // Equipment Name (Uppercase)
    z.number()  // Quantity per slot
)

export const PriceBreakdownSchema = z.object({
    base_price: z.number().optional(),
    equipment: z.string().optional(),
    quantity: z.number().optional(),
    tax: z.number().optional(),
    discount: z.number().optional(),
    final_price: z.number().optional()
}).passthrough()

export type EquipmentInventory = z.infer<typeof EquipmentInventorySchema>
export type SlotEquipment = z.infer<typeof SlotEquipmentSchema>
export type PriceBreakdown = z.infer<typeof PriceBreakdownSchema>

/**
 * Studio Management Schemas
 */
export const StudioCreateSchema = z.object({
    name: z.string().min(2).max(100),
    contact_number: z.string().min(5).max(20),
    date_of_birth: z.string().optional(),
    address: z.string().min(10),
    slug: z.string().min(2).max(50),
    plan: z.string().default('starter')
})

export const StudioUpdateSchema = z.object({
    name: z.string().min(2).max(100),
    address: z.string().min(10),
    location: z.string().optional(),
    description: z.string().max(1000).optional(),
    bio: z.string().max(500).optional(),
    is_public: z.boolean().default(false),
    waitlist_limit: z.number().int().min(0).max(50).default(5)
}).passthrough()

export const PayoutRequestSchema = z.object({
    studioId: z.string().uuid(),
    amount: z.number().positive(),
    paymentMethod: z.string(),
    accountName: z.string().min(2),
    accountNumber: z.string().min(5),
    bankName: z.string().optional()
})

/**
 * Cache Tags
 */
export const STUDIO_TAGS = {
    STUDIO: (id: string) => `studio-${id}`,
    SCHEDULE: (id: string) => `studio-schedule-${id}`,
    BOOKINGS: (id: string) => `studio-bookings-${id}`,
    CUSTOMERS: (id: string) => `studio-customers-${id}`,
    INVENTORY: (id: string) => `studio-inventory-${id}`,
    PRICING: (id: string) => `studio-pricing-${id}`,
    STAFF: (id: string) => `studio-staff-${id}`
} as const
