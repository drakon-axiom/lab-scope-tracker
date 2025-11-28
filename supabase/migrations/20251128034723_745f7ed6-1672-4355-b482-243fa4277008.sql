-- Create email template versions table for version history
CREATE TABLE IF NOT EXISTS public.email_template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.email_templates(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  lab_id UUID REFERENCES public.labs(id) ON DELETE SET NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  change_description TEXT
);

-- Enable RLS
ALTER TABLE public.email_template_versions ENABLE ROW LEVEL SECURITY;

-- Create policies for email_template_versions
CREATE POLICY "Users can view own template versions"
  ON public.email_template_versions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.email_templates
      WHERE email_templates.id = email_template_versions.template_id
      AND email_templates.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create template versions"
  ON public.email_template_versions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.email_templates
      WHERE email_templates.id = email_template_versions.template_id
      AND email_templates.user_id = auth.uid()
    )
  );

-- Create index for faster lookups
CREATE INDEX idx_email_template_versions_template_id ON public.email_template_versions(template_id);
CREATE INDEX idx_email_template_versions_created_at ON public.email_template_versions(created_at DESC);