import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as argon2 from 'argon2';
import { RegisterDto, LoginDto } from './auth.dto';
import { AuthTokens } from '@job-scheduler/shared';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<{ user: any; tokens: AuthTokens }> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await argon2.hash(dto.password);

    // Use a transaction to atomically create the user + default org + membership + project
    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          name: dto.name,
        },
        select: { id: true, email: true, name: true, role: true },
      });

      // Auto-create a default organization for the new user
      const org = await tx.organization.create({
        data: {
          name: `${dto.name}'s Organization`,
          ownerId: user.id,
        },
      });

      // Add user as admin member of their org
      await tx.organizationMember.create({
        data: {
          organizationId: org.id,
          userId: user.id,
          role: 'admin',
        },
      });

      // Auto-create a default project inside the org
      const { v4: uuidv4 } = require('uuid');
      await tx.project.create({
        data: {
          name: 'Default Project',
          organizationId: org.id,
          apiKey: `sk_live_${uuidv4().replace(/-/g, '')}`,
        },
      });

      return user;
    });

    const tokens = await this.generateTokens(result.id, result.email, result.role);
    return { user: result, tokens };
  }

  async login(dto: LoginDto): Promise<{ user: any; tokens: AuthTokens }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    let isPasswordValid = false;
    
    // If the user was seeded, they have a placeholder hash.
    // Allow login for testing purposes as mentioned in the UI.
    if (user.passwordHash === '$placeholder_hash_use_register_endpoint') {
      isPasswordValid = true;
    } else {
      try {
        isPasswordValid = await argon2.verify(user.passwordHash, dto.password);
      } catch (err) {
        // If verify throws due to bad hash format, consider it invalid
        isPasswordValid = false;
      }
    }

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      tokens,
    };
  }

  private async generateTokens(userId: string, email: string, role: string): Promise<AuthTokens> {
    const payload = { sub: userId, email, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_SECRET || 'dev-secret',
        expiresIn: process.env.JWT_EXPIRES_IN || '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      }),
    ]);

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return {
      accessToken,
      refreshToken,
    };
  }
}
