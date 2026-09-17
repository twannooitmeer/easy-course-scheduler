import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "bookings" ADD COLUMN "import_ref" varchar;
  ALTER TABLE "lessons" ADD COLUMN "import_ref" varchar;
  ALTER TABLE "closures" ADD COLUMN "import_ref" varchar;
  CREATE UNIQUE INDEX "bookings_import_ref_idx" ON "bookings" USING btree ("import_ref");
  CREATE UNIQUE INDEX "lessons_import_ref_idx" ON "lessons" USING btree ("import_ref");
  CREATE UNIQUE INDEX "closures_import_ref_idx" ON "closures" USING btree ("import_ref");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "bookings_import_ref_idx";
  DROP INDEX "lessons_import_ref_idx";
  DROP INDEX "closures_import_ref_idx";
  ALTER TABLE "bookings" DROP COLUMN "import_ref";
  ALTER TABLE "lessons" DROP COLUMN "import_ref";
  ALTER TABLE "closures" DROP COLUMN "import_ref";`)
}
