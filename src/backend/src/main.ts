import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import 'reflect-metadata';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({origin: "http://localhost:8080", credentials: true});
  // app.enableCors({origin: process.env.HOST + ":8080", credentials: true});
  app.use(cookieParser());
  await app.listen(3000);
}
bootstrap();
