import Layout from "@/components/Layout";
import { EmailTemplatesManager } from "@/components/EmailTemplatesManager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Code, Mail, ChevronDown } from "lucide-react";
import { useState } from "react";

const Notifications = () => {
  const [isVariablesOpen, setIsVariablesOpen] = useState(true);

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-muted-foreground mt-2">
            Manage email templates for vendor communications
          </p>
        </div>

        {/* Template Variables Documentation - Collapsible */}
        <Collapsible open={isVariablesOpen} onOpenChange={setIsVariablesOpen}>
          <Card>
            <CollapsibleTrigger className="w-full">
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Code className="h-5 w-5" />
                    <CardTitle>Template Variables</CardTitle>
                  </div>
                  <ChevronDown className={`h-5 w-5 transition-transform ${isVariablesOpen ? 'rotate-180' : ''}`} />
                </div>
                <CardDescription className="text-left">
                  Use these placeholders in your email templates - they will be replaced with actual data when sending
                </CardDescription>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <div className="border-l-4 border-primary pl-3">
                      <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                        {"{{lab_name}}"}
                      </code>
                      <p className="text-sm text-muted-foreground mt-1">
                        The name of the testing lab receiving the quote
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Example: "Janoshik Analytical"
                      </p>
                    </div>
                    
                    <div className="border-l-4 border-primary pl-3">
                      <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                        {"{{quote_number}}"}
                      </code>
                      <p className="text-sm text-muted-foreground mt-1">
                        The unique quote reference number
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Example: "Q-2024-001"
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="border-l-4 border-primary pl-3">
                      <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                        {"{{quote_items}}"}
                      </code>
                      <p className="text-sm text-muted-foreground mt-1">
                        Formatted list of all items in the quote with details
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Includes: Product names, client info, samples, prices, additional samples, and report headers
                      </p>
                    </div>
                    
                    <div className="border-l-4 border-primary pl-3">
                      <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                        {"{{total}}"}
                      </code>
                      <p className="text-sm text-muted-foreground mt-1">
                        The total quote value including all items and fees
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Example: "$1,250.00"
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-muted/50 rounded-lg border">
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Example Usage
                  </h4>
                  <div className="font-mono text-xs bg-background p-3 rounded border space-y-1">
                    <div>Dear {"{{lab_name}}"},</div>
                    <div className="mt-2">Quote Reference: {"{{quote_number}}"}</div>
                    <div className="mt-2">{"{{quote_items}}"}</div>
                    <div className="mt-2">Total: {"{{total}}"}</div>
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
        
        <EmailTemplatesManager />
      </div>
    </Layout>
  );
};

export default Notifications;
