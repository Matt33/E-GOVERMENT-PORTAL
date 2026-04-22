import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AuthModule } from './auth/auth.module';
import { AuthApiModule } from './auth-api/auth-api.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { FlowableModule } from './flowable/flowable.module';
import { GoRulesModule } from './gorules/gorules.module';
import { IdRenewalModule } from './id-renewal/id-renewal.module';
import { ScholarshipModule } from './scholarship/scholarship.module';
import { BusinessLicenseModule } from './business-license/business-license.module';
import { PoliciesModule } from './policies/policies.module';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'frontend'),
      serveRoot: '/',
      serveStaticOptions: {
        extensions: ['html'],
        index: 'index.html',
      },
    }),
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST ?? process.env.DATABASE_HOST ?? 'localhost',
      port: parseInt(
        process.env.DB_PORT ?? process.env.DATABASE_PORT ?? '5432',
        10,
      ),
      username: process.env.DB_USER ?? process.env.DATABASE_USER ?? 'egov_user',
      password:
        process.env.DB_PASS ?? process.env.DATABASE_PASSWORD ?? 'egov_pass',
      database: process.env.DB_NAME ?? process.env.DATABASE_NAME ?? 'egov_db',
      autoLoadEntities: true,
      synchronize: true,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    AuthModule,
    AuthApiModule,
    FlowableModule,
    GoRulesModule,
    IdRenewalModule,
    ScholarshipModule,
    BusinessLicenseModule,
    PoliciesModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}
