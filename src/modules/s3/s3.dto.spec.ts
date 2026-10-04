import 'reflect-metadata';
import { validate } from 'class-validator';
import { FileNameDto, PresignUploadDto } from './s3.dto';

describe('FileNameDto', () => {
  it('should accept jpg/jpeg/png names without spaces', async () => {
    for (const fileName of ['a.jpg', 'a.jpeg', 'a.png', 'a.JPG']) {
      const dto = new FileNameDto();
      dto.fileName = fileName;
      expect(await validate(dto)).toEqual([]);
    }
  });

  it('should reject spaces, forbidden chars and other extensions', async () => {
    for (const fileName of ['a b.jpg', 'a<b.jpg', 'a.pdf', 'a.jpx']) {
      const dto = new FileNameDto();
      dto.fileName = fileName;
      expect(await validate(dto)).not.toEqual([]);
    }
  });
});

describe('PresignUploadDto', () => {
  it('should accept an absent or valid size', async () => {
    const empty = new PresignUploadDto();
    empty.fileName = 'a.jpg';
    expect(await validate(empty)).toEqual([]);

    const sized = new PresignUploadDto();
    sized.fileName = 'a.jpg';
    sized.size = 1024;
    expect(await validate(sized)).toEqual([]);
  });

  it('should reject non-positive sizes', async () => {
    for (const size of [0, -5]) {
      const dto = new PresignUploadDto();
      dto.fileName = 'a.jpg';
      dto.size = size;
      expect(await validate(dto)).not.toEqual([]);
    }
  });
});
