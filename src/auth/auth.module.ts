import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { KeycloakStrategy } from './keycloak.strategy';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import authConfig from './auth.config';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AuthService } from './auth.service';

@Module({
  imports: [
    ConfigModule.forFeature(authConfig),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    HttpModule,
  ],
  providers: [KeycloakStrategy, JwtStrategy, AuthService],
  exports: [PassportModule, AuthService],
})
export class AuthModule {}
