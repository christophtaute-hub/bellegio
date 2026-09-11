alter table public.kinder
  add column einschulungsstatus text check (einschulungsstatus in ('muss','kann','korridor')),
  add column betriebszugehoerigkeit text;
