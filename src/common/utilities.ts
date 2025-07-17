import * as crypto from 'crypto';

export const generateOTP = () => {
  return crypto.randomInt(11111, 99999);
};