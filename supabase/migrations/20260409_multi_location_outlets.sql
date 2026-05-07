-- ==========================================
-- MULTI-LOCATION (OUTLETS) MIGRATION
-- 1. Create Outlets & Outlet Members
-- 2. Migrate Current Studio Data to Default Outlets
-- 3. Link Slots and Bookings to Outlets
-- ==========================================

-- 1. CREATE OUTLETS TABLE
CREATE TABLE IF NOT EXISTS public.outlets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    studio_id UUID NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT,
    floor_or_unit TEXT,
    google_maps_url TEXT,
    lat NUMERIC,
    lng NUMERIC,
    timezone TEXT DEFAULT 'Asia/Manila',
    equipment TEXT[], 
    inventory JSONB DEFAULT '{}'::jsonb,
    reformers_count INT DEFAULT 0,
    amenities TEXT[],
    space_photos_urls TEXT[],
    pricing_overrides JSONB DEFAULT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. CREATE OUTLET MEMBERS JOIN TABLE (Staff to Outlet)
CREATE TABLE IF NOT EXISTS public.outlet_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id UUID NOT NULL REFERENCES public.outlets(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.studio_members(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(outlet_id, member_id)
);

-- 3. ADD OUTLET_ID TO SLOTS AND BOOKINGS
ALTER TABLE public.slots ADD COLUMN IF NOT EXISTS outlet_id UUID REFERENCES public.outlets(id) ON DELETE SET NULL;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS outlet_id UUID REFERENCES public.outlets(id) ON DELETE SET NULL;

-- 4. MIGRATE DATA (Create a Default Outlet for every existing studio)
DO $$
DECLARE
    studio_record RECORD;
    new_outlet_id UUID;
BEGIN
    FOR studio_record IN SELECT * FROM public.studios LOOP
        -- Insert the "Main" or "Default" outlet using the current studio's location data
        INSERT INTO public.outlets (
            studio_id,
            name,
            address,
            floor_or_unit,
            google_maps_url,
            lat,
            lng,
            equipment,
            inventory,
            reformers_count,
            amenities,
            space_photos_urls,
            timezone
        ) VALUES (
            studio_record.id,
            'Main Branch', -- Initial default name
            studio_record.address,
            studio_record.floor_or_unit,
            studio_record.google_maps_url,
            studio_record.lat,
            studio_record.lng,
            studio_record.equipment,
            studio_record.inventory,
            studio_record.reformers_count,
            studio_record.amenities,
            studio_record.space_photos_urls,
            'Asia/Manila'
        ) RETURNING id INTO new_outlet_id;

        -- Point all existing slots to this newly created outlet
        UPDATE public.slots 
        SET outlet_id = new_outlet_id 
        WHERE studio_id = studio_record.id;

        -- Point all existing bookings to this outlet
        UPDATE public.bookings b
        SET outlet_id = new_outlet_id
        FROM public.slots s
        WHERE b.slot_id = s.id AND s.studio_id = studio_record.id;
        
        -- Assign all current studio members to this default outlet
        INSERT INTO public.outlet_members (outlet_id, member_id)
        SELECT new_outlet_id, id 
        FROM public.studio_members 
        WHERE studio_id = studio_record.id;
    END LOOP;
END $$;

-- 5. RLS POLICIES FOR OUTLETS
ALTER TABLE public.outlets ENABLE ROW LEVEL SECURITY;

-- Owner can do everything
CREATE POLICY "Owners can manage their outlets" ON public.outlets
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.studios WHERE id = outlets.studio_id AND owner_id = auth.uid()));

-- Members can view outlets they are assigned to
CREATE POLICY "Members can view their outlets" ON public.outlets
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.outlet_members om 
                   JOIN public.studio_members sm ON om.member_id = sm.id
                   WHERE om.outlet_id = outlets.id AND sm.profile_id = auth.uid()));

-- Public can view active outlets (for storefront)
CREATE POLICY "Public can view active outlets" ON public.outlets
    FOR SELECT TO public
    USING (is_active = true);

-- 6. RLS POLICIES FOR OUTLET_MEMBERS
ALTER TABLE public.outlet_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage outlet members" ON public.outlet_members
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.outlets o
                   JOIN public.studios s ON o.studio_id = s.id
                   WHERE o.id = outlet_members.outlet_id AND s.owner_id = auth.uid()));

CREATE POLICY "Members can view outlet colleagues" ON public.outlet_members
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.studio_members sm 
                   WHERE sm.id = outlet_members.member_id AND sm.profile_id = auth.uid())
          OR 
          EXISTS (SELECT 1 FROM public.studio_members self 
                  JOIN public.outlet_members som ON self.id = som.member_id
                  WHERE som.outlet_id = outlet_members.outlet_id AND self.profile_id = auth.uid()));
