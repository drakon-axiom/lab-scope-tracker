import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText } from "lucide-react";

const BulkImport = () => {
  const { toast } = useToast();
  const [testingTypesText, setTestingTypesText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleBulkImport = async () => {
    if (!testingTypesText.trim()) {
      toast({
        title: "No data provided",
        description: "Please enter testing types to import",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Not authenticated",
        description: "Please sign in to import data",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Parse the input - expecting format: "Test Name | Vendor | Standard | Price | Duration (days) | Description"
    // or just "Test Name" for simple imports
    const lines = testingTypesText.split("\n").filter(line => line.trim());
    const testingTypes = lines.map(line => {
      const parts = line.split("|").map(p => p.trim());
      return {
        name: parts[0],
        vendor: parts[1] || null,
        standard: parts[2] || null,
        price: parts[3] ? parseFloat(parts[3]) : null,
        duration_days: parts[4] ? parseInt(parts[4]) : null,
        description: parts[5] || null,
        user_id: user.id,
      };
    });

    const { error } = await supabase.from("testing_types").insert(testingTypes);

    setIsLoading(false);

    if (error) {
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Import successful",
        description: `Imported ${testingTypes.length} testing types`,
      });
      setTestingTypesText("");
    }
  };

  const handleLoadSample = () => {
    const sampleData = `Testosterone Analysis | Janoshik | HPLC-UV | 120 | 3 | Quantitative analysis of testosterone content
Anabolic Steroids Panel | Janoshik | HPLC-UV | 120 | 5 | Multi-compound steroid identification and quantification
Peptide Analysis | Janoshik | HPLC-MS | 180 | 7 | Peptide identification and purity testing
Heavy Metals Testing | Janoshik | ICP-MS | 60 | 3 | Detection of lead, arsenic, mercury, cadmium
Microbiological Testing | Lab Corp | USP | 150 | 5 | Total aerobic microbial count
Endotoxin Testing | Lab Corp | LAL | 100 | 2 | Bacterial endotoxin testing
Sterility Testing | Lab Corp | USP | 200 | 14 | Sterility assurance testing
Growth Hormone Analysis | Janoshik | HPLC-MS | 300 | 5 | HGH identification and quantification
IGF-1 Testing | Janoshik | HPLC-MS | 380 | 5 | Insulin-like growth factor analysis
SARMs Panel | Janoshik | HPLC-MS | 170 | 5 | Selective androgen receptor modulators testing
CBD/THC Analysis | Local Lab | HPLC-UV | 80 | 3 | Cannabinoid content analysis
Vitamin Testing | Local Lab | HPLC | 90 | 3 | Vitamin content and purity
Amino Acid Profile | Local Lab | HPLC | 120 | 4 | Complete amino acid analysis
Protein Content | Local Lab | Kjeldahl | 60 | 2 | Total protein determination
Fat Content | Local Lab | Soxhlet | 60 | 2 | Total fat determination
Moisture Content | Local Lab | Karl Fischer | 40 | 1 | Moisture determination
Dissolution Testing | Lab Corp | USP | 80 | 1 | Drug release profile
Stability Testing | Lab Corp | ICH | 500 | 30 | Long-term stability studies
Residual Solvents | Lab Corp | GC-MS | 120 | 2 | Organic volatile impurities
Tablet Hardness | Local Lab | Physical | 30 | 1 | Mechanical strength testing`;
    setTestingTypesText(sampleData);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Bulk Import Testing Types</h2>
          <p className="text-muted-foreground">
            Import multiple testing types at once from Janoshik or other labs
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Import Data
              </CardTitle>
              <CardDescription>
                Paste your testing types below. Each line should be a separate test.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="testing-types">Testing Types</Label>
                <Textarea
                  id="testing-types"
                  placeholder="Test Name | Vendor | Standard | Price | Duration | Description&#10;Example: Testosterone Analysis | Janoshik | HPLC-UV | 120 | 3 | Quantitative analysis"
                  value={testingTypesText}
                  onChange={(e) => setTestingTypesText(e.target.value)}
                  className="min-h-[400px] font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Format: Test Name | Vendor | Standard | Price ($) | Duration (days) | Description
                  <br />
                  Or simply: Test Name (one per line)
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleBulkImport} disabled={isLoading} className="flex-1">
                  {isLoading ? "Importing..." : "Import Testing Types"}
                </Button>
                <Button onClick={handleLoadSample} variant="outline">
                  Load Sample Data
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Import Instructions
              </CardTitle>
              <CardDescription>How to import testing types from Janoshik</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <h4 className="font-semibold mb-2">Format Options:</h4>
                <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                  <li>
                    <strong>Simple format:</strong> Just test names, one per line
                    <pre className="mt-1 p-2 bg-muted rounded text-xs">
                      Testosterone Analysis
                      Peptide Testing
                      Heavy Metals Panel
                    </pre>
                  </li>
                  <li>
                    <strong>Detailed format:</strong> Pipe-separated values
                    <pre className="mt-1 p-2 bg-muted rounded text-xs">
                      Test Name | Vendor | Standard | Price | Days | Description
                    </pre>
                  </li>
                </ol>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Sample Janoshik Tests:</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Anabolic Steroids Analysis (HPLC-UV)</li>
                  <li>Peptide Identification (HPLC-MS)</li>
                  <li>Heavy Metals Testing (ICP-MS)</li>
                  <li>Growth Hormone Analysis (HPLC-MS)</li>
                  <li>SARMs Panel (HPLC-MS)</li>
                  <li>Microbiological Testing (USP)</li>
                  <li>Endotoxin Testing (LAL)</li>
                  <li>Sterility Testing (USP)</li>
                </ul>
              </div>

              <div className="p-3 bg-primary/10 rounded-md">
                <p className="text-xs">
                  <strong>Tip:</strong> Click "Load Sample Data" to see pre-populated common
                  testing types. You can edit this data before importing, or clear it and add your
                  own.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Alternative: SQL Script</CardTitle>
            <CardDescription>
              You can also run this SQL script directly in your backend to import common Janoshik
              testing types
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="p-4 bg-muted rounded-md text-xs overflow-x-auto">
              {`-- Replace 'your-user-id' with your actual user ID
-- Find your user ID by checking your profile after signing in

INSERT INTO testing_types (name, vendor, standard, price, duration_days, description, user_id) VALUES
('Testosterone Analysis', 'Janoshik', 'HPLC-UV', 120, 3, 'Quantitative analysis of testosterone content', 'your-user-id'),
('Anabolic Steroids Panel', 'Janoshik', 'HPLC-UV', 120, 5, 'Multi-compound steroid identification', 'your-user-id'),
('Peptide Analysis', 'Janoshik', 'HPLC-MS', 180, 7, 'Peptide identification and purity testing', 'your-user-id'),
('Heavy Metals Testing', 'Janoshik', 'ICP-MS', 60, 3, 'Lead, arsenic, mercury, cadmium detection', 'your-user-id'),
('Growth Hormone Analysis', 'Janoshik', 'HPLC-MS', 300, 5, 'HGH identification and quantification', 'your-user-id'),
('SARMs Panel', 'Janoshik', 'HPLC-MS', 170, 5, 'Selective androgen receptor modulators testing', 'your-user-id'),
('Microbiological Testing', 'Lab Corp', 'USP', 150, 5, 'Total aerobic microbial count', 'your-user-id'),
('Endotoxin Testing', 'Lab Corp', 'LAL', 100, 2, 'Bacterial endotoxin testing', 'your-user-id'),
('Sterility Testing', 'Lab Corp', 'USP', 200, 14, 'Sterility assurance testing', 'your-user-id');`}
            </pre>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default BulkImport;
