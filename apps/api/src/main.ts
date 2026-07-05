import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ResponseInterceptor, HttpExceptionFilter } from './common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'], // simplified logging for now
  });

  // Global Prefix
  app.setGlobalPrefix('api');

  // Enable CORS
  app.enableCors();

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global Interceptor and Filter
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('Job Scheduler API')
    .setDescription('Distributed job scheduling platform API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
    
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Enable shutdown hooks for Prisma
  app.enableShutdownHooks();

  const port = process.env.API_PORT || 3000;
  await app.listen(port);
  console.log(`🚀 API Server running on: http://localhost:${port}/api`);
  console.log(`📚 Swagger documentation on: http://localhost:${port}/api/docs`);
  console.log(`🖥️  Dashboard running on: http://localhost:${port}`);
}

bootstrap();
