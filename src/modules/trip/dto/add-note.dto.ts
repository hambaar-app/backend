import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class BroadcastNote {
  @IsNotEmpty()
  @IsString()
  note: string;
}

export class AddNoteDto extends BroadcastNote {
  @IsNotEmpty()
  @IsUUID()
  packageId: string;
}