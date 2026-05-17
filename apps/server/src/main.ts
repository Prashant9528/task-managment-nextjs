import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  // Create the NestJS application
  const app = await NestFactory.create(AppModule);

  // Enable global validation (validates DTOs automatically)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,        // Strip properties not in DTO
      forbidNonWhitelisted: true,  // Throw error for extra properties
      transform: true,        // Auto-transform types
    }),
  );

  // CORS: Allow frontend to connect
  // In production, FRONTEND_URL env var should be set to your Vercel URL
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  app.enableCors({
    origin: frontendUrl,
    credentials: true,
  });

  // Swagger API Documentation
  const config = new DocumentBuilder()
    .setTitle('Task Manager API')
    .setDescription('REST API for the Kanban Task Management application')
    .setVersion('1.0')
    .addBearerAuth()  // Adds JWT auth to Swagger UI
    .addTag('auth', 'Authentication endpoints')
    .addTag('boards', 'Board management endpoints')
    .addTag('tasks', 'Task management endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);  // Swagger UI at /api

  // Start server on PORT (Railway sets this automatically)
  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`🚀 Server is running on port ${port}`);
  console.log(`📚 Swagger docs at /api`);
}

bootstrap();
