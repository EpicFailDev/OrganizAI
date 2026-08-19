-- ============================================================
-- Migration: adiciona a coluna odometer_km (km/litro) na tabela
-- transactions. Usada em abastecimentos e lançamentos Uber/99
-- para o cálculo futuro de rendimento do veículo.
-- ============================================================
ALTER TABLE public.transactions
  ADD COLUMN odometer_km numeric;

COMMENT ON COLUMN public.transactions.odometer_km IS
  'Odômetro do veículo (km) no momento do lançamento — usado para cálculo de rendimento (km/litro).';