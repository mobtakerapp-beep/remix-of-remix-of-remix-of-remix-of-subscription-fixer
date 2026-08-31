ALTER TABLE public.activation_codes ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone;

COMMENT ON COLUMN public.activation_codes.expires_at IS 'Optional expiration timestamp after which the activation code is no longer valid';