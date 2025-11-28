import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import Layout from "@/components/Layout";
import { Loader2 } from "lucide-react";

interface ProductEntry {
  name: string;
  price_usd: number;
}

const CHROMATE_DATA = {
  "vendor": "Chromate",
  "products": {
    "Health Supplements": [
      { "name": "Creatine", "price_usd": 120 },
      { "name": "TUDCA", "price_usd": 120 },
      { "name": "Melatonin", "price_usd": 120 },
      { "name": "EVOO Biophenols", "price_usd": 300 }
    ],
    "Microbiology": [
      { "name": "Sterility Test", "price_usd": 240 },
      { "name": "Endotoxin Count", "price_usd": 240 }
    ],
    "Variance Testing": [
      { "name": "Additional Peptide Vial", "price_usd": 50 },
      { "name": "Additional Capsule / Tablet", "price_usd": 30 }
    ],
    "Research Peptides": [
      { "name": "Semaglutide", "price_usd": 300 },
      { "name": "Tirzepatide", "price_usd": 300 },
      { "name": "Retatrutide", "price_usd": 300 },
      { "name": "Cagrilintide", "price_usd": 380 },
      { "name": "Mazdutide", "price_usd": 380 },
      { "name": "Survodutide", "price_usd": 380 },
      { "name": "Liraglutide", "price_usd": 300 },
      { "name": "hGH (191aa)", "price_usd": 300 },
      { "name": "hGH w/ dimer", "price_usd": 420 },
      { "name": "Adamax", "price_usd": 240 },
      { "name": "AOD-9604", "price_usd": 180 },
      { "name": "BPC-157", "price_usd": 180 },
      { "name": "CJC-1295 DAC", "price_usd": 180 },
      { "name": "CJC-1295 no DAC", "price_usd": 180 },
      { "name": "DSIP", "price_usd": 240 },
      { "name": "Epithalon", "price_usd": 240 },
      { "name": "GHK Basic", "price_usd": 240 },
      { "name": "GHK-Cu", "price_usd": 240 },
      { "name": "GHRP-2", "price_usd": 180 },
      { "name": "GHRP-6", "price_usd": 180 },
      { "name": "Glutathion", "price_usd": 120 },
      { "name": "Gonadorelin", "price_usd": 240 },
      { "name": "Hexarelin", "price_usd": 240 },
      { "name": "hGH frag 176-191", "price_usd": 180 },
      { "name": "Ipamorelin", "price_usd": 180 },
      { "name": "Kisspeptin-10", "price_usd": 380 },
      { "name": "KPV", "price_usd": 380 },
      { "name": "Melanotan-1", "price_usd": 380 },
      { "name": "Melanotan-2", "price_usd": 180 },
      { "name": "MOTS-c", "price_usd": 380 },
      { "name": "Oxytocin", "price_usd": 380 },
      { "name": "PT-141", "price_usd": 180 },
      { "name": "Selank", "price_usd": 240 },
      { "name": "Semax", "price_usd": 240 },
      { "name": "Sermorelin", "price_usd": 240 },
      { "name": "Tesamorelin", "price_usd": 240 },
      { "name": "Thymosin alpha-1", "price_usd": 240 },
      { "name": "TB-500 (43aa)", "price_usd": 180 },
      { "name": "TB-500 (17-23)", "price_usd": 180 },
      { "name": "Triptorelin", "price_usd": 180 }
    ],
    "Research Chemicals": [
      { "name": "Tesofensine", "price_usd": 300 },
      { "name": "SLU-PP-332", "price_usd": 300 },
      { "name": "5-Amino-1-MQ", "price_usd": 300 },
      { "name": "Anastrozole", "price_usd": 180 },
      { "name": "Exemestane", "price_usd": 180 },
      { "name": "Letrozole", "price_usd": 180 },
      { "name": "Cabergoline", "price_usd": 180 },
      { "name": "Tadalafil", "price_usd": 180 },
      { "name": "Sildenafil", "price_usd": 180 },
      { "name": "Tamoxifen", "price_usd": 180 },
      { "name": "Raloxifene", "price_usd": 180 },
      { "name": "Clomiphene", "price_usd": 180 },
      { "name": "Enclomiphene", "price_usd": 180 },
      { "name": "Finasteride", "price_usd": 180 },
      { "name": "Dutasteride", "price_usd": 180 },
      { "name": "RU-58841", "price_usd": 180 },
      { "name": "Minoxidil", "price_usd": 180 },
      { "name": "Liothyronine", "price_usd": 180 },
      { "name": "L-Thyroxine", "price_usd": 180 }
    ],
    "SARMs": [
      { "name": "AC-262", "price_usd": 170 },
      { "name": "ACP-105", "price_usd": 170 },
      { "name": "GW0742", "price_usd": 170 },
      { "name": "GW501516", "price_usd": 170 },
      { "name": "LGD3303", "price_usd": 170 },
      { "name": "LGD4033", "price_usd": 170 },
      { "name": "MK2866", "price_usd": 170 },
      { "name": "MK677", "price_usd": 170 },
      { "name": "OTR-AC", "price_usd": 170 },
      { "name": "RAD140", "price_usd": 170 },
      { "name": "RAD150", "price_usd": 170 },
      { "name": "SR9009", "price_usd": 170 },
      { "name": "SR9011", "price_usd": 170 },
      { "name": "S23", "price_usd": 170 },
      { "name": "S4", "price_usd": 170 },
      { "name": "YK11", "price_usd": 170 }
    ]
  }
};

export default function ImportChromatePricing() {
  const [importing, setImporting] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLog(prev => [...prev, message]);
  };

  const handleImport = async () => {
    setImporting(true);
    setLog([]);

    try {
      addLog("Starting import...");

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("No user logged in");
        return;
      }
      addLog(`User: ${user.email}`);

      // Get Chromate lab
      const { data: labs } = await supabase
        .from("labs")
        .select("id, name")
        .ilike("name", "%chromate%")
        .maybeSingle();

      if (!labs) {
        toast.error("Chromate lab not found");
        addLog("❌ Chromate lab not found");
        return;
      }

      const chromateLabId = labs.id;
      addLog(`✓ Found Chromate lab: ${labs.name}`);

      // Get existing products
      const { data: existingProducts } = await supabase
        .from("products")
        .select("id, name")
        .eq("user_id", user.id);

      const productMap = new Map(
        existingProducts?.map(p => [p.name.toLowerCase().trim(), p.id]) || []
      );

      addLog(`✓ Found ${productMap.size} existing compounds`);

      let created = 0;
      let pricingAdded = 0;
      let pricingUpdated = 0;

      // Process all products from JSON
      for (const [category, products] of Object.entries(CHROMATE_DATA.products)) {
        addLog(`\nProcessing category: ${category}`);
        
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
              addLog(`❌ Error creating ${product.name}: ${createError.message}`);
              continue;
            }

            productId = newProduct.id;
            productMap.set(productNameLower, productId);
            created++;
            addLog(`  ✓ Created: ${product.name}`);
          }

          // Check if pricing already exists
          const { data: existingPricing } = await supabase
            .from("product_vendor_pricing")
            .select("id, price")
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
              addLog(`  ❌ Error updating pricing for ${product.name}: ${updateError.message}`);
            } else {
              pricingUpdated++;
              addLog(`  ↻ Updated: ${product.name} ($${existingPricing.price} → $${product.price_usd})`);
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
              addLog(`  ❌ Error adding pricing for ${product.name}: ${pricingError.message}`);
            } else {
              pricingAdded++;
              addLog(`  + Added: ${product.name} - $${product.price_usd}`);
            }
          }
        }
      }

      addLog("\n=== Summary ===");
      addLog(`Compounds created: ${created}`);
      addLog(`Pricing added: ${pricingAdded}`);
      addLog(`Pricing updated: ${pricingUpdated}`);
      addLog(`Total processed: ${created + pricingAdded + pricingUpdated}`);

      toast.success(`Import complete! Created ${created} compounds, added ${pricingAdded} pricing entries, updated ${pricingUpdated}`);
    } catch (error: any) {
      console.error("Import error:", error);
      toast.error("Import failed: " + error.message);
      addLog(`❌ Import failed: ${error.message}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Import Chromate Pricing</CardTitle>
            <CardDescription>
              This will import all Chromate pricing data, creating missing compounds and adding/updating vendor pricing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={handleImport} 
              disabled={importing}
              size="lg"
            >
              {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {importing ? "Importing..." : "Start Import"}
            </Button>

            {log.length > 0 && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">Import Log:</h3>
                <div className="font-mono text-xs space-y-1 max-h-96 overflow-y-auto">
                  {log.map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
