import { Controller, Get, Post, UseInterceptors, UploadedFile, Body } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

// Type for uploaded file
interface UploadedFileType {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
}

@Controller()
export class AppController {
  @Get()
  getRoot() {
    return { message: 'Welcome to NestJS backend!' };
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          const filename = `${uniqueSuffix}${ext}`;
          cb(null, filename);
        },
      }),
      fileFilter: (req, file, cb) => {
        // Accept images, videos, PDFs, and documents
        if (
          file.mimetype.startsWith('image/') ||
          file.mimetype.startsWith('video/') ||
          file.mimetype === 'application/pdf' ||
          file.mimetype === 'application/msword' ||
          file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ) {
          cb(null, true);
        } else {
          cb(new Error('Invalid file type. Only images, videos, PDFs, and documents are allowed.'), false);
        }
      },
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
      },
    }),
  )
  async uploadFile(
    @UploadedFile() file: UploadedFileType | undefined,
    @Body() body: any,
  ) {
    try {
      if (!file) {
        return {
          success: false,
          message: 'No file uploaded',
        };
      }

      return {
        success: true,
        message: 'File uploaded successfully',
        file: {
          filename: file.filename,
          originalname: file.originalname,
          size: file.size,
          mimetype: file.mimetype,
          url: `/uploads/${file.filename}`,
        },
        metadata: {
          title: body.title,
          description: body.description,
          type: body.type,
          subject: body.subject,
          grade: body.grade,
          status: body.status,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Upload failed',
      };
    }
  }
}
