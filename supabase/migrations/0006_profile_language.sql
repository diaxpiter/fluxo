-- UI language preference, mirrored client-side by the NEXT_LOCALE cookie.
alter table public.profiles
add column language text not null default 'en-US' check (
  language in ('en-US', 'pt-BR', 'pt-PT')
);
