import { AppDataSource } from './data-source';
import { User } from './user/user.entity';
import * as bcrypt from 'bcrypt';

async function createAdmin() {
  try {
    await AppDataSource.initialize();
    console.log('Database connection established');
    
    const userRepository = AppDataSource.getRepository(User);
    
    // Check if admin already exists
    const existingAdmin = await userRepository.findOne({ where: { email: 'admin@example.com' } });
    
    if (existingAdmin) {
      console.log('Admin user already exists');
      return;
    }
    
    const admin = new User();
    admin.email = 'admin@example.com';
    admin.name = 'Admin';
    admin.password = await bcrypt.hash('admin123', 10);
    admin.role = 'admin';
    
    await userRepository.save(admin);
    console.log('Admin user created successfully!');
    console.log('Email: admin@example.com');
    console.log('Password: admin123');
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await AppDataSource.destroy();
  }
}

createAdmin();
