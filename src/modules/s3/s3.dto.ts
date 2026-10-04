import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  registerDecorator,
  ValidationArguments,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export function IsValidFilename(allowExtensions: string[] = []) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidFilename',
      target: object.constructor,
      propertyName: propertyName,
      validator: {
        validate(value: any, _args: ValidationArguments) {
          const filename = value.trim();

          // eslint-disable-next-line no-control-regex -- control characters are intentionally forbidden in filenames
          const forbiddenChars = /[<>:"/\\|?*\x00-\x1f]/;
          if (forbiddenChars.test(filename)) {
            return false;
          }

          if (filename.includes(' ')) {
            return false;
          }

          if (allowExtensions && allowExtensions.length > 0) {
            const hasValidExtension = allowExtensions.some((ext) => {
              const normalizedExt = ext.startsWith('.') ? ext : `.${ext}`;
              return filename
                .toLowerCase()
                .endsWith(normalizedExt.toLowerCase());
            });

            if (!hasValidExtension) {
              return false;
            }
          }

          return true;
        },
      },
    });
  };
}

export class FileNameDto {
  @ApiProperty({ description: 'Image should be in .jpg/.jpeg/.png format.' })
  @IsNotEmpty()
  @IsString()
  @IsValidFilename(['.jpg', '.jpeg', '.png'])
  fileName: string;
}

export class PresignUploadDto extends FileNameDto {
  @ApiProperty({
    description:
      'Declared file size in bytes (optional). Rejected when it exceeds MAX_UPLOAD_SIZE_MB.',
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  size?: number;
}
