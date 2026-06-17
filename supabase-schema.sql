-- SUPABASE SCHEMA DEFINITION

-- 1. Create Services Table
CREATE TABLE IF NOT EXISTS public.services (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    service_name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL DEFAULT 0,
    duration INTEGER NOT NULL DEFAULT 30,
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Note: The instructions assumed the following tables might also need to be created if not present.
-- If they already exist, this will safely skip due to IF NOT EXISTS (if supported in your context) or you can run only the services part.

-- 2. Create Staff Table
CREATE TABLE IF NOT EXISTS public.staff (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    staff_name TEXT,
    name TEXT,
    gender TEXT,
    phone TEXT,
    joining_date DATE,
    salary NUMERIC DEFAULT 15000,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create Bills/Invoices Table
CREATE TABLE IF NOT EXISTS public.bills (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id INTEGER REFERENCES public.customers(id),
    customer_name TEXT,
    customer_phone TEXT,
    date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    services JSONB DEFAULT '[]'::jsonb,
    staff_id UUID REFERENCES public.staff(id),
    staff_name TEXT,
    grand_total NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
