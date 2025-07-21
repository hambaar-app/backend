import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateModelDto {
  @IsNotEmpty()
  @IsUUID()
  brandId: string;

  @IsNotEmpty()
  @IsString()
  model: string;
}