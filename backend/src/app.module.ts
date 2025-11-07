import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { User } from './user/user.entity';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { ContentModule } from './content/content.module';

@Module({
  imports: [
    // Configure ConfigModule to be globally available
    ConfigModule.forRoot({
      isGlobal: true, // Makes ConfigModule available everywhere without explicit import
      envFilePath: '.env', // Load environment variables from .env file
    }),
    
    // Configure TypeORM with SQLite
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'db.sqlite',
      entities: [User],
      synchronize: true, // Set to false in production
      logging: true,
    }),
    
    // Application modules
    AuthModule,
    UserModule,
    ContentModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
