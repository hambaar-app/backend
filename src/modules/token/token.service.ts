import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { AuthMessages } from 'src/common/enums/messages.enum';

@Injectable()
export class TokenService {
  private accessSecretKey: string;
  private tempSecretKey: string;
  private authSecretKey: string;

  
  constructor(
    config: ConfigService,
  ) {
    this.accessSecretKey = config.getOrThrow<string>('JWT_ACCESS_SECRET_KEY');
    this.tempSecretKey = config.getOrThrow<string>('JWT_TEMP_SECRET_KEY');
    this.authSecretKey = config.getOrThrow<string>('JWT_AUTH_SECRET_KEY');
  }

  private generateToken(payload: JwtPayload, token: string , { expiresIn }: jwt.SignOptions) {
    return jwt.sign(payload, token, { expiresIn });
  }

  private generateAccessToken(payload: JwtPayload) {
    const accessSecretKey = this.accessSecretKey
    return this.generateToken(payload, accessSecretKey, { expiresIn: '20d' });
  }

  private generateTempToken(payload: JwtPayload) {
    const tempSecretKey = this.tempSecretKey
    return this.generateToken(payload, tempSecretKey, { expiresIn: '10m' });
  }

  private generateAuthToken(payload: JwtPayload) {
    const authSecretKey = this.authSecretKey
    return this.generateToken(payload, authSecretKey, { expiresIn: '1d' });
  }

  verifyToken(token: string, type: 'access' | 'temp' | 'auth') {
    if (!token || typeof token !== 'string') {
      throw new UnauthorizedException(AuthMessages.InvalidToken);
    }

    try {
      let secretKey: string;
      switch (type) {
        case 'access':
          secretKey = this.accessSecretKey;
          break;

        case 'temp':
          secretKey = this.tempSecretKey;
          break;

        case 'auth':
          secretKey = this.authSecretKey;
          break;
      }

      return jwt.verify(token, secretKey) as JwtPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedException(AuthMessages.TokenExpired);
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedException(AuthMessages.InvalidToken);
      }
      throw new UnauthorizedException(AuthMessages.TokenVerificationFailed);
    }
  }
}
