-- Migration 0011: add index on variant_overlays.created_at for faster listing/order-by
CREATE INDEX IF NOT EXISTS idx_variant_overlays_created_at ON variant_overlays(created_at);
