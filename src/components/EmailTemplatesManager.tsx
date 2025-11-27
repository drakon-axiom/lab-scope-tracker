import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Mail, Plus, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  lab_id: string | null;
  is_default: boolean;
}

interface Lab {
  id: string;
  name: string;
}

export function EmailTemplatesManager() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Email Templates</h3>
        <Button onClick={() => handleOpenDialog()} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
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
                value={formData.lab_id}
                onValueChange={(value) => setFormData({ ...formData, lab_id: value })}
              >
                <SelectTrigger id="template-lab">
                  <SelectValue placeholder="All labs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All labs</SelectItem>
                  {labs.map((lab) => (
                    <SelectItem key={lab.id} value={lab.id}>
                      {lab.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <Button onClick={handleSaveTemplate}>
              {editingTemplate ? "Update" : "Create"} Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
