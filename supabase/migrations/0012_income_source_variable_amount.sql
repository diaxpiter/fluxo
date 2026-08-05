-- Mirrors recurring_bills' is_variable/estimated_amount split: a paycheck can be just as
-- unpredictable as a bill (freelance income, tips, commission), so income sources need the
-- same "amount is a guess, not a fact" distinction. expected_amount keeps its existing meaning
-- for fixed sources; estimated_amount is the equivalent for variable ones.
alter table public.income_sources
add column is_variable boolean not null default false,
add column estimated_amount numeric(12, 2);
