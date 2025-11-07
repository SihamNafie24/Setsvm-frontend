import { Controller, Get, Post, UseGuards, UseInterceptors, UploadedFile, Body, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
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

export interface ContentItem {
  id: string;
  title: string;
  type: 'quiz' | 'lesson' | 'video' | 'document';
  subject: string;
  grade: string;
  status: 'draft' | 'published' | 'archived';
  description?: string;
  fileUrl?: string;
  fileName?: string;
  createdAt: string;
  updatedAt: string;
}

@Controller('contents')
export class ContentController {

  @Get('my-contents')
  @UseGuards(AuthGuard('jwt'))
  getMyContents(): { data: ContentItem[] } {
    // Mock data - replace with actual database call
    return {
      data: [
        {
          id: '1',
          title: 'Introduction to Algebra',
          type: 'lesson',
          subject: 'Mathematics',
          grade: '7',
          status: 'published',
          description: 'Basic concepts of algebra',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: '2',
          title: 'Photosynthesis Quiz',
          type: 'quiz',
          subject: 'Biology',
          grade: '9',
          status: 'draft',
          description: 'Test your knowledge about photosynthesis',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]
    };
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
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
  async createContent(
    @UploadedFile() file: UploadedFileType | undefined,
    @Body() body: any,
    @Req() req: any,
  ) {
    try {
      const contentData = {
        title: body.title,
        description: body.description || '',
        type: body.type,
        subject: body.subject,
        grade: body.grade,
        status: body.status || 'draft',
        fileUrl: file ? `/uploads/${file.filename}` : undefined,
        fileName: file ? file.originalname : undefined,
        userId: req.user?.id || req.user?.sub || 'unknown',
      };

      // Generate a mock ID for now (replace with actual database save)
      const newContent: ContentItem = {
        id: Date.now().toString(),
        title: contentData.title,
        description: contentData.description,
        type: contentData.type,
        subject: contentData.subject,
        grade: contentData.grade,
        status: contentData.status,
        fileUrl: contentData.fileUrl,
        fileName: contentData.fileName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return {
        data: newContent,
        message: 'Content created successfully',
      };
    } catch (error) {
      throw error;
    }
  }
}
