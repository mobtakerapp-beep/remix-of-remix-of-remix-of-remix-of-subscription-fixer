create or replace function public.grant_admin_by_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if lower(new.email) in ('uuxz272@gmail.com') then
    insert into public.user_roles (user_id, role)
    values (new.id, 'admin')
    on conflict (user_id, role) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_grant_admin on auth.users;
create trigger on_auth_user_created_grant_admin
after insert on auth.users
for each row execute function public.grant_admin_by_email();

insert into public.user_roles (user_id, role)
select u.id, 'admin' from auth.users u
where lower(u.email) in ('uuxz272@gmail.com')
on conflict (user_id, role) do nothing;