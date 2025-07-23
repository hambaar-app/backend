import {
  registerDecorator,
  ValidationArguments,
  IsNotEmpty,
  IsString,
  IsUUID,
} from 'class-validator';

export function IsValidFilename(
  allowExtensions: string[] = []
) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidFilename',
      target: object.constructor,
      propertyName: propertyName,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const filename = value.trim();

          const forbiddenChars = /[<>:"/\\|?*\x00-\x1f]/;
          if (forbiddenChars.test(filename)) {
            return false;
          }
          
          if (filename.includes(' ')) {
            return false;
          }

          if (allowExtensions && allowExtensions.length > 0) {
            const hasValidExtension = allowExtensions.some(ext => {
              const normalizedExt = ext.startsWith('.') ? ext : `.${ext}`;
              return filename.toLowerCase().endsWith(normalizedExt.toLowerCase());
            });
            
            if (!hasValidExtension) {
              return false;
            }
          }

          return true;
        }
      },
    });
  };
}

class FileNameDto {
  @IsNotEmpty()
  @IsString()
  @IsValidFilename(['.jpg', '.jpeg', '.png'])
  fileName: string;
}

export class TransporterPictureDto extends FileNameDto {
  @IsNotEmpty()
  @IsUUID()
  transporterId: string;
}

export class VehiclePictureDto extends TransporterPictureDto {
  @IsNotEmpty()
  @IsUUID()
  vehicleId: string;
}