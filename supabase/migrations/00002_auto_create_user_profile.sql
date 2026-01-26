-- Automatically create a user profile when a new auth user is created

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, phone)
  values (new.id, new.phone)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger on auth.users insert
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Also create profile for any existing auth users that don't have one
insert into public.users (id, phone)
select id, phone from auth.users
where id not in (select id from public.users)
and phone is not null
on conflict (id) do nothing;
