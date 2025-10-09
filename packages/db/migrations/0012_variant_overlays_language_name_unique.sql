-- Migration 0012: ensure overlay names are unique per language (null language allowed)
ALTER TABLE "variant_overlays"
  ADD CONSTRAINT "variant_overlays_language_name_unique" UNIQUE ("language_id", "name");
