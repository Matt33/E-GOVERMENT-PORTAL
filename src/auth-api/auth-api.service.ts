import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import axios from 'axios';
import { AuthApiLoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

export interface KeycloakTokenResponse {
  access_token: string;
  [key: string]: unknown;
}

interface KeycloakUser {
  id: string;
  [key: string]: unknown;
}

interface KeycloakRole {
  id: string;
  name: string;
  [key: string]: unknown;
}

@Injectable()
export class AuthApiService {
  private readonly logger = new Logger(AuthApiService.name);
  private readonly keycloakUrl =
    process.env.KEYCLOAK_URL || 'http://localhost:8080';
  private readonly realm = process.env.KEYCLOAK_REALM || 'egov-portal';
  private readonly clientId =
    process.env.KEYCLOAK_CLIENT_ID || 'id-renewal-api';
  private readonly clientSecret =
    process.env.KEYCLOAK_CLIENT_SECRET || 'xPnisDToolKxJGD9GRsBx1Tn3G0zcbKD';

  async login(dto: AuthApiLoginDto): Promise<KeycloakTokenResponse> {
    const params = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      username: dto.username,
      password: dto.password,
      grant_type: 'password',
    });

    try {
      const response = await axios.post<KeycloakTokenResponse>(
        `${this.keycloakUrl}/realms/${this.realm}/protocol/openid-connect/token`,
        params,
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
      );
      return response.data;
    } catch {
      this.logger.error('Authentication failed in login.');
      throw new HttpException('Authentication failed', HttpStatus.UNAUTHORIZED);
    }
  }

  private async getAdminToken(): Promise<string> {
    const params = new URLSearchParams({
      grant_type: 'password',
      client_id: 'admin-cli',
      username: 'admin',
      password: 'admin',
    });

    try {
      const response = await axios.post<KeycloakTokenResponse>(
        `${this.keycloakUrl}/realms/master/protocol/openid-connect/token`,
        params,
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      );
      return response.data.access_token;
    } catch {
      this.logger.error('Failed to fetch admin token.');
      throw new HttpException(
        'Failed to fetch admin token',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async getUserIdByUsername(
    token: string,
    username: string,
  ): Promise<string> {
    try {
      const response = await axios.get<KeycloakUser[]>(
        `${this.keycloakUrl}/admin/realms/${this.realm}/users?username=${encodeURIComponent(username)}&exact=true`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const users = response.data;
      if (!users || users.length === 0) {
        throw new Error('User not found after creation.');
      }
      return String(users[0].id);
    } catch {
      this.logger.error('Failed to fetch user ID.');
      throw new HttpException(
        'Failed to fetch user ID',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async getCitizenRoleId(
    token: string,
  ): Promise<Record<string, unknown>> {
    try {
      const response = await axios.get<KeycloakRole>(
        `${this.keycloakUrl}/admin/realms/${this.realm}/roles/citizen`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      return { id: response.data.id, name: response.data.name };
    } catch {
      this.logger.error('Could not fetch citizen role from Keycloak.');
      throw new HttpException(
        'Could not fetch citizen role from Keycloak',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async register(dto: RegisterDto): Promise<{ message: string }> {
    const adminToken = await this.getAdminToken();

    try {
      await axios.post(
        `${this.keycloakUrl}/admin/realms/${this.realm}/users`,
        {
          username: dto.username,
          email: dto.email,
          firstName: dto.firstName,
          enabled: true,
          emailVerified: true,
          credentials: [
            {
              type: 'password',
              value: dto.password,
              temporary: false,
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
        },
      );
    } catch {
      this.logger.error(
        'Failed to create user in Keycloak (possible duplicate).',
      );
      throw new HttpException(
        'Failed to create user. Username or email may already exist.',
        HttpStatus.CONFLICT,
      );
    }

    const userId = await this.getUserIdByUsername(adminToken, dto.username);
    const role = await this.getCitizenRoleId(adminToken);

    try {
      await axios.post(
        `${this.keycloakUrl}/admin/realms/${this.realm}/users/${userId}/role-mappings/realm`,
        [role],
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
        },
      );
    } catch {
      this.logger.error('Role assignment failed.');
      throw new HttpException(
        'Role assignment failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return { message: 'Registration successful' };
  }
}
