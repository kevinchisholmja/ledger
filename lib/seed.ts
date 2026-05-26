import { db } from "@/lib/db/client";
import { categories, buckets } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

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

export async function seedPresetsIfEmpty(userId: string): Promise<void> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(categories)
    .where(eq(categories.user_id, userId));

  if ((row?.count ?? 0) > 0) return; // already seeded — exit fast

  // Insert categories, get back IDs
  const inserted = await db
    .insert(categories)
    .values(PRESET_CATEGORIES.map((c) => ({ user_id: userId, name: c.name, icon: c.icon })))
    .returning({ id: categories.id, name: categories.name });

  const catMap = new Map(inserted.map((c) => [c.name, c.id]));

  // Insert budgets, linking each to its matching category
  await db.insert(buckets).values(
    PRESET_BUDGETS.map((b) => ({
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
