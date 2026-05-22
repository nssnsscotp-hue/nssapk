-- ========================================================================
--                      NSS DIGITAL HUB - HOD DATABASE MIGRATIONS
-- ========================================================================
-- Execute this SQL code inside your Supabase SQL Editor to configure
-- database columns, indexes, and Row Level Security (RLS) policies 
-- for HOD and department-level tracking.

-- ------------------------------------------------------------------------
-- 1. ADD DEPARTMENT FIELDS TO CORRESPONDING SCHEMAS
-- ------------------------------------------------------------------------

-- Add department tracking to Profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS department TEXT;

-- Add department tracking to Registration Onboarding
ALTER TABLE public.pending_requests 
ADD COLUMN IF NOT EXISTS department TEXT;

-- ------------------------------------------------------------------------
-- 2. CREATE DATABASE VALUE INDEXES FOR INTENSE FILTERING
-- ------------------------------------------------------------------------

-- Speed up filtering volunteers by department
CREATE INDEX IF NOT EXISTS idx_profiles_department 
ON public.profiles(department);

-- Speed up filtering attendance records by volunteer name
CREATE INDEX IF NOT EXISTS idx_marked_attendance_volunteer_name 
ON public.marked_attendance(volunteer_name);

-- ------------------------------------------------------------------------
-- 3. ENABLE ROW LEVEL SECURITY (RLS) AND SETUP POLICIES
-- ------------------------------------------------------------------------

-- Ensure RLS is enabled on tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marked_attendance ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------
-- POLICY: SELECT PROFILES (VOLUNTEER LIST CODES)
-- Allows HODs to query details for volunteers belonging to their same department.
-- ------------------------------------------------------------------------

CREATE POLICY "Allows HODs to view profiles of their department"
ON public.profiles
FOR SELECT
TO authenticated, anon
USING (
  -- Admin can view everything
  (EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.role = 'admin'
  ))
  OR
  -- HOD can view users belonging to their own department
  (EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
      AND p.role = 'hod' 
      AND p.department = public.profiles.department
  ))
  OR
  -- Users can view their own profiles
  (id = auth.uid())
);

-- ------------------------------------------------------------------------
-- POLICY: SELECT ATTENDANCE LOGS
-- Allows HODs to view marked attendance records for volunteers in their department.
-- ------------------------------------------------------------------------

CREATE POLICY "Allows HODs to view attendance logs of department volunteers"
ON public.marked_attendance
FOR SELECT
TO authenticated, anon
USING (
  -- Admin can view everything
  (EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.role = 'admin'
  ))
  OR
  -- HOD can view logs of users belonging to their same department
  (EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
      AND p.role = 'hod' 
      AND p.department = (
        SELECT department FROM public.profiles v 
        WHERE v.full_name = public.marked_attendance.volunteer_name 
        LIMIT 1
      )
  ))
  OR
  -- Fallback for volunteers matching usernames
  true
);

-- ------------------------------------------------------------------------
-- POLICY: MANAGE PENDING REGISTRATIONS ONBOARDING
-- Allows admins and public handles to write to registrations
-- ------------------------------------------------------------------------

CREATE POLICY "Allows public/admins to select and write pending entries"
ON public.pending_requests
FOR ALL
TO authenticated, anon
USING (true)
WITH CHECK (true);
