-- DEVELOPMENT ONLY. Review the selected rows before committing this transaction.
begin;
select id, name, slug from public.businesses where slug like 'test-%';
delete from public.businesses where slug like 'test-%';
commit;
