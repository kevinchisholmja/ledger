import {
  Utensils,
  ShoppingCart,
  Car,
  Zap,
  ShoppingBag,
  Pill,
  Clapperboard,
  Plane,
  Briefcase,
  CreditCard,
  type LucideIcon,
} from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  "Food & Drink": Utensils,
  Groceries: ShoppingCart,
  Transport: Car,
  Utilities: Zap,
  Shopping: ShoppingBag,
  Health: Pill,
  Entertainment: Clapperboard,
  Travel: Plane,
  Business: Briefcase,
};

export function getCategoryIcon(name: string | null | undefined): LucideIcon {
  return MAP[name ?? ""] ?? CreditCard;
}

export default function CategoryIcon({
  name,
  className = "size-4",
}: {
  name: string | null | undefined;
  className?: string;
}) {
  const Icon = getCategoryIcon(name);
  return <Icon className={className} />;
}
