import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const spots = sqliteTable("spots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  category: text("category").notNull(),
  description: text("description"),
  magazineContext: text("magazine_context"),
  embedding: text("embedding"), // Placeholder -- actual column is F32_BLOB(1536) via custom migration
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  googlePlaceId: text("google_place_id"),
  rating: real("rating"),
  address: text("address"),
  openingHours: text("opening_hours"),
  source: text("source").default("manual"),
});

export type Spot = typeof spots.$inferSelect;
export type NewSpot = typeof spots.$inferInsert;
