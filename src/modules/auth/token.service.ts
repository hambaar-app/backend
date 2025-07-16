import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { AuthMessages } from 'src/common/enums/messages.enum';

@Injectable()
export class TokenService {
  private accessSecretKey: string;
  
  constructor(
    config: ConfigService,
  ) {
    this.accessSecretKey = config.getOrThrow<string>('JWT_ACCESS_SECRET_KEY');
  }

  private generateAccessToken(payload: JwtPayload, expiresIn = 1_728_000 /* 20 days */) {
    const accessSecretKey = this.accessSecretKey
    return jwt.sign(payload, accessSecretKey, { expiresIn });
  }

  verifyToken(token: string) {
    if (!token || typeof token !== 'string') {
      throw new UnauthorizedException(AuthMessages.InvalidToken);
    }

    try {
      return jwt.verify(token, this.accessSecretKey) as JwtPayload;
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
