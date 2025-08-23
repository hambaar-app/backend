import { IsNotEmpty, IsUUID } from 'class-validator';

export class CreateEscrowDto {
  @IsNotEmpty()
  @IsUUID()  
  packageId: string;
  
  @IsNotEmpty()
  @IsUUID()
  tripId: string;
}