-- Create storage bucket for lab reports
INSERT INTO storage.buckets (id, name, public)
VALUES ('lab-reports', 'lab-reports', false);

-- Allow authenticated users to upload reports for their own quotes
CREATE POLICY "Users can upload reports for their quotes"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'lab-reports' 
  AND auth.uid() IN (
    SELECT user_id FROM quotes 
    WHERE id::text = (storage.foldername(name))[1]
  )
);

-- Allow authenticated users to view reports for their own quotes
CREATE POLICY "Users can view reports for their quotes"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'lab-reports'
  AND auth.uid() IN (
    SELECT user_id FROM quotes 
    WHERE id::text = (storage.foldername(name))[1]
  )
);

-- Allow authenticated users to delete reports for their own quotes
CREATE POLICY "Users can delete reports for their quotes"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'lab-reports'
  AND auth.uid() IN (
    SELECT user_id FROM quotes 
    WHERE id::text = (storage.foldername(name))[1]
  )
);