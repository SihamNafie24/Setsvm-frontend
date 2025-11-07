import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // Create uploads directory if it doesn't exist
  const uploadsDir = join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  
  // Serve static files from uploads directory
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads',
  });
  
  // Enable CORS
  app.enableCors({
    origin: [
      'http://localhost:5173',  // Vite dev server
      'http://127.0.0.1:5173', // Vite dev server (explicit IPv4)
      'http://[::1]:5173',     // Vite dev server (IPv6)
      'http://localhost:3000',  // Backend (for API testing)
      'http://127.0.0.1:3000', // Backend (explicit IPv4)
      'http://[::1]:3000',     // Backend (IPv6)
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization',
    exposedHeaders: 'Authorization',
    credentials: true,
    maxAge: 3600,
  });
  
  // Set global prefix for all routes
  app.setGlobalPrefix('api');
  
  // Enable validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));

  await app.listen(3000);
  console.log(`Application is running on: ${await app.getUrl()}`);
}

bootstrap();
