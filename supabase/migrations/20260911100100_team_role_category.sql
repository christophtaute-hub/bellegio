alter table public.team
  add column role_category text
    check (role_category in ('fk','ek','ak','nicht_paed','sprachfoerderung','hausmeister','hauswirtschaft'));

update public.team set role_category = case when fachkraft then 'fk' else 'ek' end
where role_category is null;

alter table public.team alter column role_category set not null;
