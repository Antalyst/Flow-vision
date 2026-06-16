import { serverSupabaseServiceRole } from '#supabase/server'
import { hash } from 'bcrypt-ts'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { email, password, full_name, acctype_id, birth_date, org_code } = body
  const db = event.context.db

  const client = await serverSupabaseServiceRole(event)

  if (!email || !password || !full_name || !acctype_id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required fields',
    })
  }

  // 1. Get the account type name from Supabase using the provided UUID
  const { data: typeData, error: typeError } = await client
    .from('account_types')
    .select('name')
    .eq('acctype_id', acctype_id)
    .single();

  if (typeError || !typeData) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid account type selected',
    })
  }

  const typeName = typeData.name;
  
  let role = '';
  if (typeName.toLowerCase() === 'organization') {
    role = 'client';
  } else if (typeName.toLowerCase() === 'employee') {
    role = 'employee';
  } else {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid account type selected',
    });
  }

  const today = new Date();
  const bDay = new Date(birth_date);
  let age = today.getFullYear() - bDay.getFullYear();
  if (today < new Date(today.getFullYear(), bDay.getMonth(), bDay.getDate())) {
    age--;
  }
  const birthYear = bDay.getFullYear();

  try {
    let resolvedOrgId = null;

    // 2. Resolve Organization ID in Supabase if employee
    if (role === 'employee') {
      if (!org_code) {
        throw createError({ statusCode: 400, statusMessage: 'Organization code is required for employees' });
      }
      const { data: orgData, error: orgError } = await client
        .from('org')
        .select('org_id')
        .eq('code', org_code)
        .single();

      if (orgError || !orgData) {
        throw createError({ statusCode: 404, statusMessage: 'Invalid organization code' });
      }
      resolvedOrgId = orgData.org_id;
    }

    // 3. Insert User into Supabase
    const hashedPassword = await hash(password, 10)
    console.log("Inserting user into Supabase...");
    const { data: profileData, error: profileError } = await client
      .from('users')
      .insert({
        email: email,
        full_name: full_name,
        role: role,
        acctype_id: acctype_id, 
        birth_year: birthYear,
        birth_date: birth_date,
        age: age,
        status: 1,
        password: hashedPassword,
        org_id: resolvedOrgId
      })
      .select() 
      .single()

    if (profileError) {
      console.error("Supabase User Insert Error:", profileError);
      throw profileError;
    }

    return {
      success: true,
      message: 'Registration successful',
      user: profileData,
      token: 'session_token_placeholder'
    };

  } catch (error: any) {
    console.error("REGISTRATION ERROR:", error);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Error during registration',
    });
  }
})
