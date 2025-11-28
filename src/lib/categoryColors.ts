export const categoryColorMap: Record<string, { bg: string; text: string }> = {
  "Peptides": {
    bg: "bg-category-peptides",
    text: "text-category-peptides-foreground"
  },
  "SARMs": {
    bg: "bg-category-sarms",
    text: "text-category-sarms-foreground"
  },
  "AAS": {
    bg: "bg-category-aas",
    text: "text-category-aas-foreground"
  },
  "Research Chemicals": {
    bg: "bg-category-research-chemicals",
    text: "text-category-research-chemicals-foreground"
  },
  "Supplements": {
    bg: "bg-category-supplements",
    text: "text-category-supplements-foreground"
  },
};

export function getCategoryColors(category: string | null): { bg: string; text: string } {
  if (!category) return { bg: "bg-muted", text: "text-muted-foreground" };
  return categoryColorMap[category] || { bg: "bg-muted", text: "text-muted-foreground" };
}
