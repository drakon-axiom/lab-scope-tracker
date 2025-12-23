interface QuoteItemForPricing {
  additional_samples?: number | null;
  additional_report_headers?: number | null;
  products?: { name: string } | null;
}

const ADDITIONAL_SAMPLE_PRICE = 60;
const ADDITIONAL_HEADER_PRICE = 30;
const PREMIUM_COMPOUNDS = ["Tirzepatide", "Semaglutide", "Retatrutide"];

/**
 * Calculate additional samples price ($60 each for Tirzepatide, Semaglutide, Retatrutide)
 */
export const getAdditionalSamplesPrice = (item: QuoteItemForPricing): number => {
  if (!item.additional_samples || item.additional_samples === 0) return 0;
  const compoundName = item.products?.name || "";
  const isPremiumCompound = PREMIUM_COMPOUNDS.some(
    name => compoundName.toLowerCase().includes(name.toLowerCase())
  );
  // Currently same price for all compounds, but structure allows for different pricing
  return isPremiumCompound 
    ? item.additional_samples * ADDITIONAL_SAMPLE_PRICE 
    : item.additional_samples * ADDITIONAL_SAMPLE_PRICE;
};

/**
 * Calculate additional headers price ($30 each)
 */
export const getAdditionalHeadersPrice = (item: QuoteItemForPricing): number => {
  if (!item.additional_report_headers || item.additional_report_headers === 0) return 0;
  return item.additional_report_headers * ADDITIONAL_HEADER_PRICE;
};

/**
 * Get effective sample price (modified or default)
 */
export const getEffectiveSamplePrice = (
  item: QuoteItemForPricing & { id: string },
  modifiedPrices: Record<string, string>
): number => {
  if (modifiedPrices[item.id] !== undefined && modifiedPrices[item.id] !== "") {
    return parseFloat(modifiedPrices[item.id]) || 0;
  }
  return getAdditionalSamplesPrice(item);
};

/**
 * Get effective header price (modified or default)
 */
export const getEffectiveHeaderPrice = (
  item: QuoteItemForPricing & { id: string },
  modifiedPrices: Record<string, string>
): number => {
  if (modifiedPrices[item.id] !== undefined && modifiedPrices[item.id] !== "") {
    return parseFloat(modifiedPrices[item.id]) || 0;
  }
  return getAdditionalHeadersPrice(item);
};
