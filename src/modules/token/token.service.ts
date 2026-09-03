import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { AuthTokens } from '../../common/enums/auth.enum';
import { AuthMessages } from '../../common/enums/messages.enum';
import {
  AccessTokenPayload,
  ProgressTokenPayload,
  TemporaryTokenPayload,
} from './token.types';

@Injectable()
export class TokenService {
  private accessSecretKey: string;
  private tempSecretKey: string;
  private progressSecretKey: string;
  private config: ConfigService;

  constructor(config: ConfigService) {
    this.config = config;
    this.accessSecretKey = config.getOrThrow<string>('JWT_ACCESS_SECRET_KEY');
    this.tempSecretKey = config.getOrThrow<string>('JWT_TEMP_SECRET_KEY');
    this.progressSecretKey = config.getOrThrow<string>(
      'JWT_PROGRESS_SECRET_KEY',
    );
  }

  generateAccessToken(payload: AccessTokenPayload): string {
    const expiresIn = this.config.get<jwt.SignOptions['expiresIn']>(
      'JWT_ACCESS_EXPIRES_IN',
      '20d',
    );
    return this.generateToken(payload, this.accessSecretKey, { expiresIn });
  }

  generateTempToken(payload: TemporaryTokenPayload): string {
    const expiresIn = this.config.get<jwt.SignOptions['expiresIn']>(
      'JWT_TEMP_EXPIRES_IN',
      '20m',
    );
    return this.generateToken(payload, this.tempSecretKey, { expiresIn });
  }

  generateProgressToken(payload: ProgressTokenPayload): string {
    const expiresIn = this.config.get<jwt.SignOptions['expiresIn']>(
      'JWT_PROGRESS_EXPIRES_IN',
      '1d',
    );
    return this.generateToken(payload, this.progressSecretKey, { expiresIn });
  }

  verifyToken(token: string, type: AuthTokens) {
    if (!token || typeof token !== 'string') {
      throw new UnauthorizedException(AuthMessages.InvalidToken);
    }

    try {
      let secretKey: string;
      switch (type) {
        case AuthTokens.Access:
          secretKey = this.accessSecretKey;
          break;

        case AuthTokens.Temporary:
          secretKey = this.tempSecretKey;
          break;

        case AuthTokens.Progress:
          secretKey = this.progressSecretKey;
          break;
      }

      return jwt.verify(token, secretKey) as jwt.JwtPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedException(`${type} token has expired`);
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedException(`${type} invalid token`);
      }
      throw new UnauthorizedException(`${type} verification failed`);
    }
  }

  private generateToken(
    payload: jwt.JwtPayload,
    secret: string,
    { expiresIn }: jwt.SignOptions,
  ) {
    return jwt.sign(payload, secret, { expiresIn });
  }
}
