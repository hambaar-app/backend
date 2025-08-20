import { IsInt, IsNotEmpty, Min } from 'class-validator';

export class AddFundsDto {
  @IsNotEmpty()
  @IsInt()
  @Min(100_000)
  amount: number;
}