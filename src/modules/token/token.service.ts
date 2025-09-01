import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { AuthTokens } from '../../common/enums/auth.enum';
import { AuthMessages } from '../../common/enums/messages.enum';

@Injectable()
export class TokenService {
  private accessSecretKey: string;
  private tempSecretKey: string;
  private progressSecretKey: string;

  constructor(
    config: ConfigService,
  ) {
    this.accessSecretKey = config.getOrThrow<string>('JWT_ACCESS_SECRET_KEY');
    this.tempSecretKey = config.getOrThrow<string>('JWT_TEMP_SECRET_KEY');
    this.progressSecretKey = config.getOrThrow<string>('JWT_PROGRESS_SECRET_KEY');
  }

  private generateToken(payload: jwt.JwtPayload, token: string , { expiresIn }: jwt.SignOptions) {
    return jwt.sign(payload, token, { expiresIn });
  }

  private generateAccessToken(payload: jwt.JwtPayload) {
    const accessSecretKey = this.accessSecretKey
    return this.generateToken(payload, accessSecretKey, { expiresIn: '20d' });
  }

  private generateTempToken(payload: jwt.JwtPayload) {
    const tempSecretKey = this.tempSecretKey
    return this.generateToken(payload, tempSecretKey, { expiresIn: '20m' });
  }

  private generateProgressToken(payload: jwt.JwtPayload) {
    const authSecretKey = this.progressSecretKey
    return this.generateToken(payload, authSecretKey, { expiresIn: '1d' });
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
}
