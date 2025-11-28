import { Syringe, Dumbbell, Pill, Droplet, FlaskConical, LucideIcon } from "lucide-react";

export const categoryIconMap: Record<string, LucideIcon> = {
  "Peptides": Syringe,
  "SARMs": Dumbbell,
  "AAS": Pill,
  "Research Chemicals": FlaskConical,
  "Supplements": Droplet,
};

export function getCategoryIcon(category: string | null): LucideIcon {
  if (!category) return FlaskConical;
  return categoryIconMap[category] || FlaskConical;
}
