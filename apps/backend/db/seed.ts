import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { eq } from 'drizzle-orm';
import * as schema from './schema';
import { hashPassword } from '../src/modules/auth/utils';

const dbFile = process.env.PETREL_DB_PATH ?? './petrel.db';

async function seed() {
  console.log('🌱 Seeding database...');

  const sqlite = new Database(dbFile);
  const db = drizzle(sqlite, { schema });

  try {
    // Check if admin user already exists
    const existingAdmin = await db.query.users.findFirst({
      where: eq(schema.users.username, 'admin'),
    });

    if (existingAdmin) {
      console.log('⚠️ Admin user already exists, skipping...');
      sqlite.close();
      return;
    }

    // Hash the default admin password
    const passwordHash = await hashPassword('admin123');

    // Insert default admin user
    await db.insert(schema.users).values({
      username: 'admin',
      passwordHash,
      role: 'admin',
    });

    console.log('✅ Default admin user created successfully');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('   ⚠️  Please change the default password after first login!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  } finally {
    sqlite.close();
  }
}

seed();
