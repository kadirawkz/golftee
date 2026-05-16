
-- Enable RLS on new reference tables
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_tiers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to ensure clean apply)
DROP POLICY IF EXISTS "Allow public read access for locations" ON public.locations;
DROP POLICY IF EXISTS "Allow public read access for course styles" ON public.course_styles;
DROP POLICY IF EXISTS "Allow public read access for membership tiers" ON public.membership_tiers;

-- Create policies for authenticated users to read reference data
CREATE POLICY "Allow public read access for locations" 
ON public.locations FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow public read access for course styles" 
ON public.course_styles FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow public read access for membership tiers" 
ON public.membership_tiers FOR SELECT 
USING (auth.role() = 'authenticated');
