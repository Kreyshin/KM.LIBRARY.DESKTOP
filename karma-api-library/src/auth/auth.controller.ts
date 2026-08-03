import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { CurrentAccount, CurrentSession } from './current-reader.decorator';
import { LoginDto } from './dto/login.dto';
import { CreateProfileDto } from './dto/profile.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Post('register') register(@Body() dto: RegisterDto) { return this.auth.register(dto); }
  @Post('login') login(@Body() dto: LoginDto) { return this.auth.login(dto); }
  @Get('profiles') @UseGuards(AuthGuard) profiles(@CurrentAccount() account: { id: string }) { return this.auth.profiles(account.id); }
  @Post('profiles') @UseGuards(AuthGuard) createProfile(@CurrentAccount() account: { id: string }, @Body() dto: CreateProfileDto) { return this.auth.createProfile(account.id, dto); }
  @Post('profiles/:id/switch') @UseGuards(AuthGuard) switchProfile(@CurrentAccount() account: { id: string }, @CurrentSession() sessionId: string, @Param('id') profileId: string) { return this.auth.switchProfile(account.id, profileId, sessionId); }
  @Post('logout') @UseGuards(AuthGuard) logout(@CurrentSession() sessionId: string) { return this.auth.logout(sessionId); }
}
