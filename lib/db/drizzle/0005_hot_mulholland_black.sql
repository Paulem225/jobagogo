ALTER TABLE "jobs" ADD COLUMN "country" text;
--> statement-breakpoint
-- Legacy rows were created before the external API country was persisted.
-- Backfill only when existing location/source signals identify the market;
-- keep ambiguous rows out of the Ivorian catalogue without deleting them.
UPDATE "jobs"
SET "country" = 'Sénégal'
WHERE
  (
    "location" ILIKE ANY (ARRAY[
      '%dakar%', '%sénégal%', '%senegal%', '%thiès%', '%thies%',
      '%saint-louis%', '%saint louis%', '%ouakam%', '%yene%', '%bandia%',
      '%kedougou%', '%guédiawaye%', '%guediawaye%', '%pikine%', '%rufisque%'
    ])
    OR "source_url" ILIKE ANY (ARRAY[
      '%emploisenegal.com%', '%senjob.com%', '%emploidakar.com%',
      '%globalbusiness-gbg.com%', '%directemploi.com%'
    ])
  );
--> statement-breakpoint
UPDATE "jobs"
SET "country" = 'Côte d''Ivoire'
WHERE
  (
    "location" ILIKE ANY (ARRAY[
      '%côte d''ivoire%', '%côte d’ivoire%', '%cote d''ivoire%',
      '%cote d’ivoire%', '%abidjan%', '%bouak%', '%yamoussoukro%',
      '%korhogo%', '%san-pedro%', '%san pedro%', '%daloa%', '%gagnoa%',
      '%bondoukou%', '%dimbokro%', '%ferkess%', '%odienné%', '%odienne%',
      '%toumodi%', '%sassandra%', '%soubré%', '%soubre%', '%katiola%',
      '%divo%', '%marcory%', '%cocody%', '%yopougon%', '%koumassi%',
      '%treichville%', '%plateau%'
    ])
    OR "source_url" ILIKE ANY (ARRAY[
      '%ci.linkedin.com%', '%.ci/%', '%cote-d-ivoire%',
      '%cote%20d%27ivoire%'
    ])
  )
  AND "country" IS NULL;
--> statement-breakpoint
UPDATE "jobs"
SET "country" = 'legacy-unknown'
WHERE "country" IS NULL;
--> statement-breakpoint
ALTER TABLE "jobs" ALTER COLUMN "country" SET NOT NULL;