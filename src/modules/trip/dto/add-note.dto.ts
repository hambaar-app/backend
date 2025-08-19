import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class BroadcastNoteDto {
  @IsNotEmpty()
  @IsString()
  note: string;
}

export class AddNoteDto extends BroadcastNoteDto {
  @IsNotEmpty()
  @IsUUID()
  packageId: string;
}