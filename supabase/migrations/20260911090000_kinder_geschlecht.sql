alter table public.kinder
  add column geschlecht text not null default 'keine_angabe'
  check (geschlecht in ('maennlich', 'weiblich', 'divers', 'keine_angabe'));
