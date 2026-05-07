import { Membership, Package } from "@/types/agency";

export type DiscountType = 'fixed_amount' | 'percentage';

export interface DiscountInfo {
    id: string;
    discount_type: DiscountType;
    discount_value: number;
}

/**
 * Pure function to calculate the discount amount.
 */
export function calculateDiscount(basePrice: number, discount: DiscountInfo): number {
    if (discount.discount_type === 'fixed_amount') {
        return Math.min(basePrice, discount.discount_value);
    } else {
        return (basePrice * discount.discount_value) / 100;
    }
}

/**
 * Pure function to calculate expiration date.
 */
export function calculateExpiration(validityDays: number, activationType: string): string | null {
    if (activationType !== 'purchase' || !validityDays) {
        return null;
    }
    
    const now = new Date();
    const expiresAt = new Date(now.getTime() + validityDays * 24 * 60 * 60 * 1000);
    return expiresAt.toISOString();
}

/**
 * Pure function to calculate final price after all discounts.
 */
export function calculateFinalPrice(basePrice: number, discounts: number[]): number {
    const totalDiscount = discounts.reduce((acc, d) => acc + d, 0);
    return Math.max(0, basePrice - totalDiscount);
}
