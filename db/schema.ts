import { sql } from "drizzle-orm";
import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const userStates = sqliteTable("user_states", {
  userId: text("user_id").primaryKey(),
  recipeStatus: text("recipe_status").notNull().default("{}"),
  notes: text("notes").notNull().default("{}"),
  preferences: text("preferences").notNull().default("{}"),
  mealPlan: text("meal_plan").notNull().default("{}"),
  groceryState: text("grocery_state").notNull().default("{}"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
