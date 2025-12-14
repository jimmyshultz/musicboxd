-- Migration: Add notification for accepted follow requests
-- When a user accepts a follow request, the requester should be notified

-- First, update the notification type constraint to include 'follow_request_accepted'
ALTER TABLE public.notifications 
    DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications 
    ADD CONSTRAINT notifications_type_check 
    CHECK (type IN ('follow', 'follow_request', 'follow_request_accepted'));

-- Function to create follow request accepted notification
CREATE OR REPLACE FUNCTION public.create_follow_request_accepted_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only create notification when status changes to 'accepted'
    -- Notification goes to the requester (the person who sent the request)
    -- Actor is the person who accepted the request (requested_id)
    IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
        INSERT INTO public.notifications (user_id, type, actor_id, reference_id)
        VALUES (NEW.requester_id, 'follow_request_accepted', NEW.requested_id, NEW.id);
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger for follow request accepted notifications
-- This fires when a follow_request is updated (specifically when status changes to 'accepted')
DROP TRIGGER IF EXISTS create_follow_request_accepted_notification_trigger ON public.follow_requests;
CREATE TRIGGER create_follow_request_accepted_notification_trigger
    AFTER UPDATE ON public.follow_requests
    FOR EACH ROW
    WHEN (NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted'))
    EXECUTE FUNCTION public.create_follow_request_accepted_notification();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.create_follow_request_accepted_notification() TO authenticated;
