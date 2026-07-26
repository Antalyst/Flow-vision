-- 03_employee_validation_migration.sql

-- 1. Add enable_employee_validation to org table
ALTER TABLE public.org
ADD COLUMN IF NOT EXISTS enable_employee_validation BOOLEAN DEFAULT false;

-- 2. Create the org_employee_whitelists table
CREATE TABLE IF NOT EXISTS public.org_employee_whitelists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL,
    employee_id_number VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    
    CONSTRAINT fk_org
      FOREIGN KEY(org_id) 
      REFERENCES public.org(org_id)
      ON DELETE CASCADE,
      
    CONSTRAINT uk_org_employee_id UNIQUE (org_id, employee_id_number)
);

-- Enable Row Level Security
ALTER TABLE public.org_employee_whitelists ENABLE ROW LEVEL SECURITY;
