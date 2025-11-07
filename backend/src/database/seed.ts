import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../user/user.entity';

export async function seedDatabase() {
  const dataSource = new DataSource({
    type: 'sqlite',
    database: 'db.sqlite',
    entities: [User],
    synchronize: true,
    logging: true,
  });

  try {
    await dataSource.initialize();
    console.log('Data Source has been initialized!');

    const userRepository = dataSource.getRepository(User);
    
    // Check if admin user already exists
    const adminExists = await userRepository.findOne({ where: { email: 'admin@example.com' } });
    
    if (!adminExists) {
      // Create admin user
      const adminUser = new User();
      adminUser.name = 'Admin';
      adminUser.email = 'admin@example.com';
      adminUser.password = await bcrypt.hash('admin123', 10);
      
      await userRepository.save(adminUser);
      console.log('Admin user created successfully!');
    } else {
      console.log('Admin user already exists');
    }
    
    console.log('Database seeding completed!');
  } catch (error) {
    console.error('Error during database seeding:', error);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

// Run the seeder
seedDatabase().catch(console.error);
