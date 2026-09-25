-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text UNIQUE NOT NULL,
  email text,
  role text DEFAULT 'user',
  status text DEFAULT 'UNVERIFIED_PHONE',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create universities table
CREATE TABLE IF NOT EXISTS public.universities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text,
  status text DEFAULT 'ACTIVE',
  student_id_rule text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Insert mock university data
INSERT INTO public.universities (name) VALUES 
('Đại học Bách Khoa Hà Nội'),
('Đại học Quốc gia Hà Nội'),
('Đại học Kinh tế Quốc dân');

-- Create student_profiles table
CREATE TABLE IF NOT EXISTS public.student_profiles (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  university_id uuid REFERENCES public.universities(id),
  student_id text,
  verification_status text DEFAULT 'NOT_SUBMITTED',
  verified_at timestamp with time zone,
  rejection_reason text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create student_verifications table
CREATE TABLE IF NOT EXISTS public.student_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  university_id uuid REFERENCES public.universities(id),
  student_id text NOT NULL,
  card_front_path text NOT NULL,
  status text DEFAULT 'PENDING',
  submitted_at timestamp with time zone DEFAULT now(),
  reviewed_at timestamp with time zone,
  reviewer_id uuid REFERENCES public.users(id),
  rejection_reason text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create private bucket for student cards (this would usually be via supabase UI or api, but can be done in postgres using storage.buckets)
INSERT INTO storage.buckets (id, name, public) VALUES ('student_cards', 'student_cards', false) ON CONFLICT DO NOTHING;

-- Storage policies: Users can only view/upload their own files
CREATE POLICY "Users can upload their own student cards" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'student_cards' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view their own student cards" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'student_cards' AND (storage.foldername(name))[1] = auth.uid()::text);
