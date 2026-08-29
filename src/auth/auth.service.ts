import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LogsService } from '../logs/logs.service';
import { LogAction } from '../common/enums/log-action.enum';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly logsService: LogsService,
  ) {}

  async login(password: string) {
    const expectedPassword = this.configService.get<string>('APP_PASSWORD');

    if (!expectedPassword || password !== expectedPassword) {
      throw new UnauthorizedException('Sifre hatali');
    }

    const accessToken = await this.jwtService.signAsync({
      authenticated: true,
    });

    await this.logsService.record({ action: LogAction.LOGIN });

    return { accessToken };
  }
}
