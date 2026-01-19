import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppController } from '../src/app.controller';
import { ConfigModule } from '@nestjs/config';

if (!process.env.DATABASE_URL) process.env.DATABASE_URL = 'postgresql://u:p@localhost:5432/db';

describe('App (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
      ],
      controllers: [AppController],
    }).compile();

    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('GET /api/v1/health', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(HttpStatus.OK)
      .expect((res) => {
        expect(res.body).toHaveProperty('status', 'ok');
      });
  });

  it('GET /api/v1/ready', () => {
    return request(app.getHttpServer())
      .get('/api/v1/ready')
      .expect(HttpStatus.OK)
      .expect((res) => {
        expect(res.body).toHaveProperty('status', 'ready');
      });
  });
});
