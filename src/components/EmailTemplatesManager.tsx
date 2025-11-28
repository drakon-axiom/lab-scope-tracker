import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Mail, Plus, Pencil, Trash2, Eye, History, Download, Upload } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  lab_id: string | null;
  is_default: boolean;
}

interface TemplateVersion {
  id: string;
  template_id: string;
  version_number: number;
  name: string;
  subject: string;
  body: string;
  lab_id: string | null;
  is_default: boolean;
  created_at: string;
  change_description: string | null;
}

interface Lab {
  id: string;
  name: string;
}

export function EmailTemplatesManager() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
  const [selectedTemplateVersions, setSelectedTemplateVersions] = useState<TemplateVersion[]>([]);
  const [previewContent, setPreviewContent] = useState({ subject: "", body: "" });
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    body: "",
    lab_id: "",
    is_default: false,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchTemplates();
    fetchLabs();
  }, []);

  const fetchTemplates = async () => {
    const { data, error } = await supabase
      .from("email_templates")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error fetching templates", description: error.message, variant: "destructive" });
    } else {
      setTemplates(data || []);
    }
  };

  const fetchLabs = async () => {
    const { data, error } = await supabase
      .from("labs")
      .select("id, name")
      .order("name");

    if (error) {
      toast({ title: "Error fetching labs", description: error.message, variant: "destructive" });
    } else {
      setLabs(data || []);
    }
  };

  const handleOpenDialog = (template?: EmailTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        name: template.name,
        subject: template.subject,
        body: template.body,
        lab_id: template.lab_id || "",
        is_default: template.is_default,
      });
    } else {
      setEditingTemplate(null);
      setFormData({
        name: "",
        subject: "Quote Request - {{quote_number}}",
        body: `Dear {{lab_name}},

We would like to request a quote for the following testing services:

{{quote_items}}

Total: {{total}}

Please provide your quote response at your earliest convenience.

Best regards`,
        lab_id: "",
        is_default: false,
      });
    }
    setDialogOpen(true);
  };

  const handleSaveTemplate = async () => {
    if (!formData.name || !formData.subject || !formData.body) {
      toast({ title: "Missing fields", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const templateData = {
      name: formData.name,
      subject: formData.subject,
      body: formData.body,
      lab_id: formData.lab_id || null,
      is_default: formData.is_default,
      user_id: user.id,
    };

    if (editingTemplate) {
      // Save current version to history before updating
      const { data: existingTemplate } = await supabase
        .from("email_templates")
        .select("*")
        .eq("id", editingTemplate.id)
        .single();

      if (existingTemplate) {
        // Get the current max version number
        const { data: versions } = await supabase
          .from("email_template_versions")
          .select("version_number")
          .eq("template_id", editingTemplate.id)
          .order("version_number", { ascending: false })
          .limit(1);

        const nextVersion = versions && versions.length > 0 ? versions[0].version_number + 1 : 1;

        // Save the old version
        await supabase.from("email_template_versions").insert({
          template_id: editingTemplate.id,
          version_number: nextVersion,
          name: existingTemplate.name,
          subject: existingTemplate.subject,
          body: existingTemplate.body,
          lab_id: existingTemplate.lab_id,
          is_default: existingTemplate.is_default,
          created_by: user.id,
          change_description: "Updated template"
        });
      }

      const { error } = await supabase
        .from("email_templates")
        .update(templateData)
        .eq("id", editingTemplate.id);

      if (error) {
        toast({ title: "Error updating template", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Template updated successfully" });
        fetchTemplates();
        setDialogOpen(false);
      }
    } else {
      const { error } = await supabase
        .from("email_templates")
        .insert(templateData);

      if (error) {
        toast({ title: "Error creating template", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Template created successfully" });
        fetchTemplates();
        setDialogOpen(false);
      }
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    const { error } = await supabase
      .from("email_templates")
      .delete()
      .eq("id", id);

    if (error) {
      toast({ title: "Error deleting template", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Template deleted successfully" });
      fetchTemplates();
    }
  };

  const handlePreview = () => {
    // Sample data for preview
    const sampleData = {
      lab_name: "Janoshik Analytical",
      quote_number: "Q-2024-001",
      quote_items: `<div style="margin-bottom: 15px; padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px;">
<strong>1. Tirzepatide Testing</strong> - $250.00<br/>
<div style="margin-top: 8px; color: #6b7280; font-size: 0.9em;">
Client: ACME Corp<br/>
Sample: Sample #123<br/>
Manufacturer: PharmaCo<br/>
Batch: BATCH-001
</div>
<div style="margin-top: 8px; padding: 8px; background-color: #f9fafb; border-radius: 4px;">
Additional Samples: 2 × $60 = $120.00
</div>
</div>
<div style="margin-bottom: 15px; padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px;">
<strong>2. Semaglutide Testing</strong> - $280.00<br/>
<div style="margin-top: 8px; color: #6b7280; font-size: 0.9em;">
Client: TechMed Inc<br/>
Sample: Sample #456<br/>
Manufacturer: BioLab<br/>
Batch: BATCH-002
</div>
</div>`,
      total: "$650.00"
    };

    let subject = formData.subject;
    let body = formData.body;

    // Replace all template variables
    Object.entries(sampleData).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      subject = subject.replace(regex, value);
      body = body.replace(regex, value);
    });

    setPreviewContent({ subject, body });
    setPreviewOpen(true);
  };

  const handleViewVersionHistory = async (templateId: string) => {
    const { data, error } = await supabase
      .from("email_template_versions")
      .select("*")
      .eq("template_id", templateId)
      .order("version_number", { ascending: false });

    if (error) {
      toast({ title: "Error fetching version history", description: error.message, variant: "destructive" });
    } else {
      setSelectedTemplateVersions(data || []);
      setVersionHistoryOpen(true);
    }
  };

  const handleRevertToVersion = async (version: TemplateVersion) => {
    if (!confirm(`Revert to version ${version.version_number}? This will create a new version with this content.`)) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get current template to save as a version
    const { data: currentTemplate } = await supabase
      .from("email_templates")
      .select("*")
      .eq("id", version.template_id)
      .single();

    if (currentTemplate) {
      // Get the current max version number
      const { data: versions } = await supabase
        .from("email_template_versions")
        .select("version_number")
        .eq("template_id", version.template_id)
        .order("version_number", { ascending: false })
        .limit(1);

      const nextVersion = versions && versions.length > 0 ? versions[0].version_number + 1 : 1;

      // Save current as a version
      await supabase.from("email_template_versions").insert({
        template_id: version.template_id,
        version_number: nextVersion,
        name: currentTemplate.name,
        subject: currentTemplate.subject,
        body: currentTemplate.body,
        lab_id: currentTemplate.lab_id,
        is_default: currentTemplate.is_default,
        created_by: user.id,
        change_description: `Reverted to version ${version.version_number}`
      });

      // Update template with version data
      const { error } = await supabase
        .from("email_templates")
        .update({
          name: version.name,
          subject: version.subject,
          body: version.body,
          lab_id: version.lab_id,
          is_default: version.is_default,
        })
        .eq("id", version.template_id);

      if (error) {
        toast({ title: "Error reverting version", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Reverted to previous version successfully" });
        fetchTemplates();
        setVersionHistoryOpen(false);
      }
    }
  };

  const handleExportTemplate = (template: EmailTemplate) => {
    const exportData = {
      name: template.name,
      subject: template.subject,
      body: template.body,
      is_default: template.is_default,
      exported_at: new Date().toISOString(),
      version: "1.0"
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `template-${template.name.toLowerCase().replace(/\s+/g, '-')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({ title: "Template exported successfully" });
  };

  const handleImportTemplate = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const importData = JSON.parse(event.target?.result as string);
          
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const { error } = await supabase.from("email_templates").insert({
            name: `${importData.name} (Imported)`,
            subject: importData.subject,
            body: importData.body,
            is_default: false, // Don't import as default
            lab_id: null,
            user_id: user.id,
          });

          if (error) {
            toast({ title: "Error importing template", description: error.message, variant: "destructive" });
          } else {
            toast({ title: "Template imported successfully" });
            fetchTemplates();
          }
        } catch (error) {
          toast({ title: "Error parsing file", description: "Invalid template file format", variant: "destructive" });
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Email Templates</h3>
        <div className="flex gap-2">
          <Button onClick={handleImportTemplate} variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button onClick={() => handleOpenDialog()} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {templates.map((template) => (
          <Card key={template.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{template.name}</CardTitle>
                  <CardDescription>
                    {template.lab_id ? `Lab specific` : "General"}
                    {template.is_default && " • Default"}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleViewVersionHistory(template.id)}
                    title="View version history"
                  >
                    <History className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleExportTemplate(template)}
                    title="Export template"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setFormData({
                        name: template.name,
                        subject: template.subject,
                        body: template.body,
                        lab_id: template.lab_id || "",
                        is_default: template.is_default,
                      });
                      handlePreview();
                    }}
                    title="Preview template"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenDialog(template)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteTemplate(template.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Subject: {template.subject}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {templates.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No email templates yet. Create one to get started.</p>
            <p className="text-sm mt-2">
              Use variables like {"{"}{"{"} lab_name {"}"}{"}"}, {"{"}{"{"} quote_items {"}"}{"}"}, {"{"}{"{"} total {"}"}{"}"}
            </p>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Edit Template" : "New Template"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="template-name">Template Name *</Label>
              <Input
                id="template-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Standard Quote Request"
              />
            </div>
            <div>
              <Label htmlFor="template-lab">Lab (Optional)</Label>
              <Select
                value={formData.lab_id || undefined}
                onValueChange={(value) => setFormData({ ...formData, lab_id: value })}
              >
                <SelectTrigger id="template-lab">
                  <SelectValue placeholder="All labs" />
                </SelectTrigger>
                <SelectContent>
                  {labs.map((lab) => (
                    <SelectItem key={lab.id} value={lab.id}>
                      {lab.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.lab_id && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setFormData({ ...formData, lab_id: "" })}
                  className="mt-1"
                >
                  Clear selection
                </Button>
              )}
            </div>
            <div>
              <Label htmlFor="template-subject">Subject *</Label>
              <Input
                id="template-subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Use {{quote_number}} for dynamic quote number"
              />
            </div>
            <div>
              <Label htmlFor="template-body">Body *</Label>
              <Textarea
                id="template-body"
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                rows={10}
                placeholder="Use {{lab_name}}, {{quote_items}}, {{total}} for dynamic content"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is-default"
                checked={formData.is_default}
                onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="is-default" className="cursor-pointer">
                Set as default template
              </Label>
            </div>
            <div className="text-sm text-muted-foreground bg-muted p-3 rounded">
              <p className="font-semibold mb-2">Available variables:</p>
              <ul className="space-y-1">
                <li>• {"{"}{"{"} lab_name {"}"}{"}"}  - Lab name</li>
                <li>• {"{"}{"{"} quote_number {"}"}{"}"}  - Quote number</li>
                <li>• {"{"}{"{"} quote_items {"}"}{"}"}  - List of quote items</li>
                <li>• {"{"}{"{"} total {"}"}{"}"}  - Total amount</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="outline" onClick={handlePreview}>
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button onClick={handleSaveTemplate}>
              {editingTemplate ? "Update" : "Create"} Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Template Preview</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-semibold">Subject:</Label>
              <div className="mt-1 p-3 bg-muted rounded border">
                {previewContent.subject}
              </div>
            </div>
            <div>
              <Label className="text-sm font-semibold">Body:</Label>
              <div 
                className="mt-1 p-4 bg-background rounded border"
                dangerouslySetInnerHTML={{ __html: previewContent.body.replace(/\n/g, '<br/>') }}
              />
            </div>
            <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded">
              <p className="font-semibold mb-1">Note:</p>
              <p>This preview uses sample data. Actual emails will contain real quote information.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Version History Dialog */}
      <Dialog open={versionHistoryOpen} onOpenChange={setVersionHistoryOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Version History</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {selectedTemplateVersions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No version history available</p>
            ) : (
              selectedTemplateVersions.map((version) => (
                <Card key={version.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base flex items-center gap-2">
                          Version {version.version_number}
                          <Badge variant="secondary" className="text-xs">
                            {new Date(version.created_at).toLocaleString()}
                          </Badge>
                        </CardTitle>
                        {version.change_description && (
                          <CardDescription>{version.change_description}</CardDescription>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRevertToVersion(version)}
                      >
                        <History className="h-4 w-4 mr-2" />
                        Revert
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <p className="text-sm font-semibold">Name:</p>
                      <p className="text-sm text-muted-foreground">{version.name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Subject:</p>
                      <p className="text-sm text-muted-foreground">{version.subject}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Body Preview:</p>
                      <p className="text-sm text-muted-foreground line-clamp-3">{version.body}</p>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVersionHistoryOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
