-- Migration: Add triggers to automatically create notifications
-- This creates notifications when users follow each other or send follow requests

-- Function to create follow notification
CREATE OR REPLACE FUNCTION public.create_follow_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Create notification for the person being followed (following_id)
    INSERT INTO public.notifications (user_id, type, actor_id, reference_id)
    VALUES (NEW.following_id, 'follow', NEW.follower_id, NEW.id);
    
    RETURN NEW;
END;
$$;

-- Function to create follow request notification
CREATE OR REPLACE FUNCTION public.create_follow_request_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Create notification for the person receiving the request (requested_id)
    INSERT INTO public.notifications (user_id, type, actor_id, reference_id)
    VALUES (NEW.requested_id, 'follow_request', NEW.requester_id, NEW.id);
    
    RETURN NEW;
END;
$$;

-- Create trigger for follow notifications
DROP TRIGGER IF EXISTS create_follow_notification_trigger ON public.user_follows;
CREATE TRIGGER create_follow_notification_trigger
    AFTER INSERT ON public.user_follows
    FOR EACH ROW
    EXECUTE FUNCTION public.create_follow_notification();

-- Create trigger for follow request notifications
DROP TRIGGER IF EXISTS create_follow_request_notification_trigger ON public.follow_requests;
CREATE TRIGGER create_follow_request_notification_trigger
    AFTER INSERT ON public.follow_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.create_follow_request_notification();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.create_follow_notification() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_follow_request_notification() TO authenticated;
