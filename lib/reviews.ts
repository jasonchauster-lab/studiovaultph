// Shared constants for the bilateral review system
// (kept separate so they can be imported by both server and client code)

export type ReviewRole = 'customer' | 'instructor'

export const CUSTOMER_TAGS = ['Technical', 'Encouraging', 'Clean Space', 'Good Equipment']
export const INSTRUCTOR_TAGS = ['Punctual', 'Respectful', 'Great Etiquette']
