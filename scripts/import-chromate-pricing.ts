import { supabase } from "../src/integrations/supabase/client";

interface ProductEntry {
  name: string;
  price_usd: number;
}

interface ChromateData {
  vendor: string;
  products: {
    [category: string]: ProductEntry[];
  };
}

async function importChromatePricing() {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error("No user logged in");
    return;
  }

  // Get Chromate lab
  const { data: labs } = await supabase
    .from("labs")
    .select("id, name")
    .ilike("name", "%chromate%")
    .single();

  if (!labs) {
    console.error("Chromate lab not found");
    return;
  }

  const chromateLabId = labs.id;
  console.log(`Found Chromate lab: ${chromateLabId}`);

  // Load JSON data
  const response = await fetch("/chromate_services_pricing_with_vendor.json");
  const data: ChromateData = await response.json();

  // Get existing products
  const { data: existingProducts } = await supabase
    .from("products")
    .select("id, name")
    .eq("user_id", user.id);

  const productMap = new Map(
    existingProducts?.map(p => [p.name.toLowerCase().trim(), p.id]) || []
  );

  console.log(`Found ${productMap.size} existing products`);

  let created = 0;
  let pricingAdded = 0;
  let pricingUpdated = 0;

  // Process all products from JSON
  for (const [category, products] of Object.entries(data.products)) {
    console.log(`\nProcessing category: ${category}`);
    
    for (const product of products) {
      const productNameLower = product.name.toLowerCase().trim();
      let productId = productMap.get(productNameLower);

      // Create product if it doesn't exist
      if (!productId) {
        const { data: newProduct, error: createError } = await supabase
          .from("products")
          .insert({
            name: product.name,
            user_id: user.id,
            category: category
          })
          .select("id")
          .single();

        if (createError) {
          console.error(`Error creating ${product.name}:`, createError);
          continue;
        }

        productId = newProduct.id;
        productMap.set(productNameLower, productId);
        created++;
        console.log(`✓ Created: ${product.name}`);
      }

      // Check if pricing already exists
      const { data: existingPricing } = await supabase
        .from("product_vendor_pricing")
        .select("id")
        .eq("product_id", productId)
        .eq("lab_id", chromateLabId)
        .maybeSingle();

      if (existingPricing) {
        // Update existing pricing
        const { error: updateError } = await supabase
          .from("product_vendor_pricing")
          .update({
            price: product.price_usd,
            is_active: true
          })
          .eq("id", existingPricing.id);

        if (updateError) {
          console.error(`Error updating pricing for ${product.name}:`, updateError);
        } else {
          pricingUpdated++;
          console.log(`↻ Updated pricing: ${product.name} - $${product.price_usd}`);
        }
      } else {
        // Add new pricing
        const { error: pricingError } = await supabase
          .from("product_vendor_pricing")
          .insert({
            product_id: productId,
            lab_id: chromateLabId,
            price: product.price_usd,
            user_id: user.id,
            is_active: true
          });

        if (pricingError) {
          console.error(`Error adding pricing for ${product.name}:`, pricingError);
        } else {
          pricingAdded++;
          console.log(`+ Added pricing: ${product.name} - $${product.price_usd}`);
        }
      }
    }
  }

  console.log("\n=== Summary ===");
  console.log(`Products created: ${created}`);
  console.log(`Pricing added: ${pricingAdded}`);
  console.log(`Pricing updated: ${pricingUpdated}`);
  console.log(`Total products processed: ${created + pricingAdded + pricingUpdated}`);
}

// Run the import
importChromatePricing().catch(console.error);
