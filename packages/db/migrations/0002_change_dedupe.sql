ALTER TABLE "changes" ADD CONSTRAINT "changes_run_key_kind_key" UNIQUE NULLS NOT DISTINCT("run_id","extractor_key","change_kind");
