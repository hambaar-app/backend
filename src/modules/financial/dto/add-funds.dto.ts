import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class AddFundsDto {
  @IsNotEmpty()
  @IsInt()
  @Min(100_000)
  amount: number;

  // TODO: Make it real
  @IsNotEmpty()
  @IsString()
  gatewayTransactionId: string;
}