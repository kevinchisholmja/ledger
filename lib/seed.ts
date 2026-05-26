import { db } from "@/lib/db/client";
import { categories, buckets } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// ── Preset categories ─────────────────────────────────────────────────────────

const PRESET_CATEGORIES = [
  { name: "Groceries",           icon: "🛒" },
  { name: "Dining Out",          icon: "🍽️" },
  { name: "Fuel",                icon: "⛽" },
  { name: "Transport",           icon: "🚌" },
  { name: "Electricity",         icon: "💡" },
  { name: "Water & Sewerage",    icon: "💧" },
  { name: "Mobile Phone",        icon: "📱" },
  { name: "Internet",            icon: "🌐" },
  { name: "Health & Pharmacy",   icon: "🏥" },
  { name: "Medical & Dental",    icon: "💊" },
  { name: "Entertainment",       icon: "🎬" },
  { name: "Clothing",            icon: "👗" },
  { name: "Personal Care",       icon: "🧴" },
  { name: "Beauty & Salon",      icon: "💇" },
  { name: "Sports & Fitness",    icon: "🏋️" },
  { name: "Education",           icon: "📚" },
  { name: "Rent & Mortgage",     icon: "🏠" },
  { name: "Home Repairs",        icon: "🛠️" },
  { name: "Garden & Outdoor",    icon: "🌱" },
  { name: "Car Maintenance",     icon: "🚗" },
  { name: "Insurance",           icon: "🛡️" },
  { name: "Travel",              icon: "✈️" },
  { name: "Subscriptions",       icon: "📺" },
  { name: "Gifts & Donations",   icon: "🎁" },
  { name: "Church & Tithe",      icon: "⛪" },
  { name: "Children & Baby",     icon: "👶" },
  { name: "Bank & Finance",      icon: "🏦" },
  { name: "Business Expenses",   icon: "💼" },
  { name: "Electronics & Tech",  icon: "🖥️" },
  { name: "Miscellaneous",       icon: "📦" },
];

// ── Preset budgets ────────────────────────────────────────────────────────────
// Each budget references a category by name. Amount is 0 — user sets their own.

const PRESET_BUDGETS: { name: string; categoryName: string; group: string }[] = [
  { name: "Groceries",          categoryName: "Groceries",          group: "Food" },
  { name: "Dining Out",         categoryName: "Dining Out",         group: "Food" },
  { name: "Fuel",               categoryName: "Fuel",               group: "Transport" },
  { name: "Transport",          categoryName: "Transport",          group: "Transport" },
  { name: "Car Maintenance",    categoryName: "Car Maintenance",    group: "Transport" },
  { name: "Electricity",        categoryName: "Electricity",        group: "Utilities" },
  { name: "Water & Sewerage",   categoryName: "Water & Sewerage",   group: "Utilities" },
  { name: "Mobile Phone",       categoryName: "Mobile Phone",       group: "Utilities" },
  { name: "Internet",           categoryName: "Internet",           group: "Utilities" },
  { name: "Health & Pharmacy",  categoryName: "Health & Pharmacy",  group: "Health" },
  { name: "Medical & Dental",   categoryName: "Medical & Dental",   group: "Health" },
  { name: "Insurance",          categoryName: "Insurance",          group: "Health" },
  { name: "Rent & Mortgage",    categoryName: "Rent & Mortgage",    group: "Housing" },
  { name: "Home Repairs",       categoryName: "Home Repairs",       group: "Housing" },
  { name: "Garden & Outdoor",   categoryName: "Garden & Outdoor",   group: "Housing" },
  { name: "Clothing",           categoryName: "Clothing",           group: "Personal" },
  { name: "Personal Care",      categoryName: "Personal Care",      group: "Personal" },
  { name: "Beauty & Salon",     categoryName: "Beauty & Salon",     group: "Personal" },
  { name: "Sports & Fitness",   categoryName: "Sports & Fitness",   group: "Personal" },
  { name: "Entertainment",      categoryName: "Entertainment",      group: "Lifestyle" },
  { name: "Subscriptions",      categoryName: "Subscriptions",      group: "Lifestyle" },
  { name: "Travel",             categoryName: "Travel",             group: "Lifestyle" },
  { name: "Education",          categoryName: "Education",          group: "Growth" },
  { name: "Church & Tithe",     categoryName: "Church & Tithe",     group: "Growth" },
  { name: "Gifts & Donations",  categoryName: "Gifts & Donations",  group: "Growth" },
];

// ── Seeding function ──────────────────────────────────────────────────────────
// Compares by name — only inserts presets the user doesn't already have.
// Safe to call on every page load; existing user data is never touched.

export async function seedPresetsIfEmpty(userId: string): Promise<void> {
  // Fetch existing names in one round-trip each
  const [existingCats, existingBucketRows] = await Promise.all([
    db.select({ name: categories.name }).from(categories).where(eq(categories.user_id, userId)),
    db.select({ name: buckets.name }).from(buckets).where(eq(buckets.user_id, userId)),
  ]);

  const existingCatNames = new Set(existingCats.map((c) => c.name));
  const existingBucketNames = new Set(existingBucketRows.map((b) => b.name));

  const missingCats = PRESET_CATEGORIES.filter((c) => !existingCatNames.has(c.name));
  const missingBudgets = PRESET_BUDGETS.filter((b) => !existingBucketNames.has(b.name));

  if (missingCats.length === 0 && missingBudgets.length === 0) return;

  // Insert missing categories
  if (missingCats.length > 0) {
    await db
      .insert(categories)
      .values(missingCats.map((c) => ({ user_id: userId, name: c.name, icon: c.icon })));
  }

  if (missingBudgets.length === 0) return;

  // Re-fetch all categories (existing + just inserted) to build the name→id map
  const allCats = await db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .where(eq(categories.user_id, userId));

  const catMap = new Map(allCats.map((c) => [c.name, c.id]));

  // Insert missing budgets linked to their matching category
  await db.insert(buckets).values(
    missingBudgets.map((b) => ({
      user_id: userId,
      name: b.name,
      period: "monthly" as const,
      amount: "0",
      currency: "JMD",
      active: true,
      group_name: b.group,
      category_id: catMap.get(b.categoryName) ?? null,
    }))
  );
}
