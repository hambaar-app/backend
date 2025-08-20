import { IsNotEmpty, IsNumberString, Length } from 'class-validator';

export class DeliveryPackageDto {
  @IsNotEmpty()
  @IsNumberString()
  @Length(5, 5)
  deliveryCode: string;
}