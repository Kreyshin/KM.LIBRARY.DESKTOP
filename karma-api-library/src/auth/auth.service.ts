import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { createHash, createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { PrismaService } from '../prisma/prisma.service';
import { parseStringArray } from '../domain/constants';
import { LoginDto } from './dto/login.dto';
import { CreateProfileDto } from './dto/profile.dto';
import { RegisterDto } from './dto/register.dto';

const scrypt = promisify(scryptCallback);
const SESSION_DAYS = 30;
const MAX_PROFILES = 8;

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    if (await this.prisma.account.findUnique({ where: { email } })) {
      throw new ConflictException('Ya existe una cuenta con este correo.');
    }
    const account = await this.prisma.account.create({
      data: {
        email,
        passwordHash: await this.hashPassword(dto.password),
        profiles: { create: { displayName: dto.displayName.trim(), position: 0 } },
      },
      include: { profiles: true },
    });
    return this.createSession(account.id, account.profiles[0].id);
  }

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();
    const account = await this.prisma.account.findUnique({ where: { email }, include: { profiles: { orderBy: { position: 'asc' } } } });
    if (!account || !(await this.verifyPassword(dto.password, account.passwordHash))) {
      throw new UnauthorizedException('Correo o contraseña incorrectos.');
    }
    if (!account.profiles.length) throw new BadRequestException('La cuenta no tiene perfiles disponibles.');
    await this.prisma.account.update({ where: { id: account.id }, data: { lastLoginAt: new Date() } });
    return this.createSession(account.id, account.profiles[0].id);
  }

  async authenticate(token: string) {
    const payload = this.verifyToken(token);
    const session = await this.prisma.authSession.findFirst({
      where: { id: payload.sid, tokenHash: this.hashToken(token), expiresAt: { gt: new Date() } },
      include: { account: true, profile: true },
    });
    if (!session || session.accountId !== payload.sub || session.profileId !== payload.pid) {
      throw new UnauthorizedException('La sesión no es válida o ha expirado.');
    }
    return {
      account: { id: session.account.id, email: session.account.email },
      reader: this.publicProfile(session.profile, session.account.email),
      sessionId: session.id,
    };
  }

  async profiles(accountId: string) {
    const account = await this.prisma.account.findUniqueOrThrow({ where: { id: accountId } });
    const profiles = await this.prisma.profile.findMany({ where: { accountId }, orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] });
    return profiles.map((profile) => this.publicProfile(profile, account.email));
  }

  async createProfile(accountId: string, dto: CreateProfileDto) {
    const count = await this.prisma.profile.count({ where: { accountId } });
    if (count >= MAX_PROFILES) throw new BadRequestException(`La cuenta admite hasta ${MAX_PROFILES} perfiles.`);
    const profile = await this.prisma.profile.create({
      data: { accountId, displayName: dto.displayName.trim(), color: dto.color || '#9F6BFF', isKids: dto.isKids || false, position: count },
    });
    const account = await this.prisma.account.findUniqueOrThrow({ where: { id: accountId } });
    return this.publicProfile(profile, account.email);
  }

  async switchProfile(accountId: string, profileId: string, currentSessionId: string) {
    const profile = await this.prisma.profile.findFirst({ where: { id: profileId, accountId } });
    if (!profile) throw new NotFoundException('Perfil no encontrado.');
    await this.prisma.authSession.deleteMany({ where: { id: currentSessionId, accountId } });
    return this.createSession(accountId, profile.id);
  }

  async logout(sessionId: string) {
    await this.prisma.authSession.deleteMany({ where: { id: sessionId } });
    return { success: true };
  }

  private publicProfile(profile: any, email: string) {
    const { favoriteGenresJson, ...safe } = profile;
    return { ...safe, email, favoriteGenres: parseStringArray(favoriteGenresJson) };
  }

  private async createSession(accountId: string, profileId: string) {
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000);
    const session = await this.prisma.authSession.create({ data: { accountId, profileId, tokenHash: randomBytes(32).toString('hex'), expiresAt } });
    const token = this.signToken({ sub: accountId, pid: profileId, sid: session.id, exp: Math.floor(expiresAt.getTime() / 1000) });
    await this.prisma.authSession.update({ where: { id: session.id }, data: { tokenHash: this.hashToken(token) } });
    const [account, profile] = await Promise.all([
      this.prisma.account.findUniqueOrThrow({ where: { id: accountId } }),
      this.prisma.profile.findUniqueOrThrow({ where: { id: profileId } }),
    ]);
    return { token, expiresAt, reader: this.publicProfile(profile, account.email) };
  }

  private async hashPassword(password: string) {
    const salt = randomBytes(16).toString('hex');
    const derived = (await scrypt(password, salt, 64)) as Buffer;
    return `scrypt$${salt}$${derived.toString('hex')}`;
  }

  private async verifyPassword(password: string, stored: string) {
    const [algorithm, salt, expectedHex] = stored.split('$');
    if (algorithm !== 'scrypt' || !salt || !expectedHex) return false;
    const expected = Buffer.from(expectedHex, 'hex');
    const actual = (await scrypt(password, salt, expected.length)) as Buffer;
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }

  private signToken(payload: { sub: string; pid: string; sid: string; exp: number }) {
    const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
    const content = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}`;
    return `${content}.${createHmac('sha256', this.jwtSecret).update(content).digest('base64url')}`;
  }

  private verifyToken(token: string): { sub: string; pid: string; sid: string; exp: number } {
    const parts = token.split('.');
    if (parts.length !== 3) throw new UnauthorizedException('Token inválido.');
    const content = `${parts[0]}.${parts[1]}`;
    const expected = createHmac('sha256', this.jwtSecret).update(content).digest();
    const received = Buffer.from(parts[2], 'base64url');
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) throw new UnauthorizedException('Token inválido.');
    try {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      if (!payload.sub || !payload.pid || !payload.sid || payload.exp <= Math.floor(Date.now() / 1000)) throw new Error();
      return payload;
    } catch { throw new UnauthorizedException('Token inválido o expirado.'); }
  }

  private hashToken(token: string) { return createHash('sha256').update(token).digest('hex'); }
  private get jwtSecret() { return process.env.JWT_SECRET!; }
}
