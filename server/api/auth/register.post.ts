import { hash } from 'bcrypt-ts'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { email, role, password, full_name, accType_id, birth_date} = body
  const today = new Date();
  const bDay = new Date(birth_date);
  let age = today.getFullYear() - bDay.getFullYear();
  if (today < new Date(today.getFullYear(), bDay.getMonth(), bDay.getDate())) {
      age--;
  }
  const db = event.context.db;

  if (!email || !password || !full_name || !accType_id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required fields',
    })
  }

  try {
    const hashedPassword = await hash(password, 10);

    const today = new Date();
    const bDay = new Date(birth_date);
    let age = today.getFullYear() - bDay.getFullYear();
    if (today < new Date(today.getFullYear(), bDay.getMonth(), bDay.getDate())) {
      age--;
    }

    const userToInsert = {
      email,
      full_name,
      role,
      accType_id,
      birth_date, 
      age,
      password: hashedPassword,
      created_at: new Date(),
      status: 1
    };

    const [rows] = await db.query(`
        INSERT INTO users (
            email, 
            full_name, 
            role, 
            accType_id, 
            birth_year, 
            age, 
            password, 
            created_at,
            status
        ) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
        userToInsert.email, 
        userToInsert.full_name, 
        userToInsert.role, 
        userToInsert.accType_id, 
        userToInsert.birth_date, 
        userToInsert.age, 
        userToInsert.password, 
        userToInsert.created_at,
        userToInsert.status
    ]);

    const { password: _, ...safeUser } = userToInsert;

    return {
      message: 'Registration successful',
      user: safeUser,
      token: 'generated-session-token', 
      row: rows
    };

  } catch (error: any) {
   
    console.error("DATABASE ERROR:", error); 
    
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Database error during registration',
    });
  }
})