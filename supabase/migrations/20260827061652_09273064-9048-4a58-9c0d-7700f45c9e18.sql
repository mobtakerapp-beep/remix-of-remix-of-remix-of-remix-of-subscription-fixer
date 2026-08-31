create type public.app_role as enum ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    role public.app_role not null,
    unique (user_id, role)
);

GRANT SELECT, INSERT, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

CREATE TABLE public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    teacher_name text,
    school text,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own profile"
ON public.profiles
FOR ALL
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (new.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.subscriptions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    plan text not null,
    status text not null default 'active',
    expires_at timestamp with time zone,
    generations_used integer not null default 0,
    reset_at timestamp with time zone not null default now(),
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now(),
    unique (user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own subscription"
ON public.subscriptions
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.activation_codes (
    id uuid primary key default gen_random_uuid(),
    code text unique not null,
    plan text not null,
    duration_days integer not null default 30,
    max_uses integer not null default 1,
    used_count integer not null default 0,
    note text,
    active boolean not null default true,
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now()
);

GRANT ALL ON public.activation_codes TO service_role;

ALTER TABLE public.activation_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages activation codes"
ON public.activation_codes
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

CREATE TABLE public.code_redemptions (
    id uuid primary key default gen_random_uuid(),
    code_id uuid references public.activation_codes(id) on delete cascade not null,
    user_id uuid references auth.users(id) on delete cascade not null,
    device_fingerprint text,
    created_at timestamp with time zone not null default now()
);

GRANT ALL ON public.code_redemptions TO service_role;

ALTER TABLE public.code_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages code redemptions"
ON public.code_redemptions
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

CREATE TABLE public.user_lessons (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    title text not null,
    package jsonb not null,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_lessons TO authenticated;
GRANT ALL ON public.user_lessons TO service_role;

ALTER TABLE public.user_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own lessons"
ON public.user_lessons
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);