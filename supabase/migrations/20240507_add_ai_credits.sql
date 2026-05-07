-- Add AI Chat Credit columns to the studios table
ALTER TABLE studios 
ADD COLUMN IF NOT EXISTS ai_chat_limit INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS ai_chat_usage INTEGER DEFAULT 0;

-- Optional: Comment on columns for clarity
COMMENT ON COLUMN studios.ai_chat_limit IS 'Monthly allowance of AI chat messages for the studio storefront assistant.';
COMMENT ON COLUMN studios.ai_chat_usage IS 'Number of AI chat messages used by the studio in the current billing cycle.';

-- RPC to atomically increment AI usage
CREATE OR REPLACE FUNCTION increment_studio_ai_usage(p_studio_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE studios 
    SET ai_chat_usage = COALESCE(ai_chat_usage, 0) + 1
    WHERE id = p_studio_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
