import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UserModule } from '../user/user.module';
import { AuthController } from './auth.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/user.entity';

@Module({
  imports: [
    // Make sure ConfigModule is imported if not global
    ConfigModule,
    
    // Import UserModule to access UserService
    UserModule,
    
    // Configure Passport with JWT strategy
    PassportModule.register({ defaultStrategy: 'jwt' }),
    
    // Configure JWT module asynchronously
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'your-secret-key'),
        signOptions: { 
          expiresIn: '1h',
        },
      }),
      inject: [ConfigService],
    }),
    
    // Import TypeOrmModule for User entity if needed
    TypeOrmModule.forFeature([User]),
  ],
  
  // Make sure to provide all necessary services
  providers: [
    AuthService, 
    JwtStrategy,
  ],
  
  // Export AuthService and JwtModule for use in other modules
  exports: [
    AuthService, 
    JwtModule,
    PassportModule,
  ],
  
  controllers: [AuthController],
})
export class AuthModule {}
