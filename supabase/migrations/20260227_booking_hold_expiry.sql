-- Add expires_at column to bookings table for 15-minute hold on unpaid bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT NULL;

-- Index for efficient cleanup queries
CREATE INDEX IF NOT EXISTS idx_bookings_expires_at ON bookings (expires_at) WHERE expires_at IS NOT NULL AND status = 'pending';
