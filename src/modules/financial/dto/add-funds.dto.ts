import { IsInt, IsNotEmpty, IsString, IsUUID, Min } from 'class-validator';

export class AddFundsDto {
  @IsNotEmpty()
  // @IsInt()
  // @Min(100_000)
  amount: number;

  // TODO: Make it real
  @IsNotEmpty()
  @IsString()
  gatewayTransactionId: string;
}

export class AddFundsAndCreateEscrow extends AddFundsDto {
  @IsNotEmpty()
  @IsUUID()  
  packageId: string;
  
  @IsNotEmpty()
  @IsUUID()
  tripId: string;
}