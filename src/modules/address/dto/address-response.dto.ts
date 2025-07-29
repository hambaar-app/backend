import { Exclude } from 'class-transformer';

export class AddressResponseDto {
  @Exclude()
  id: string;

  @Exclude()
  title?: string;

  @Exclude()
  country?: string;

  @Exclude()
  province: string;

  @Exclude()
  city: string;

  @Exclude()
  street: string;

  @Exclude()
  details: string;

  @Exclude()
  plate?: number;

  @Exclude()
  postalCode?: string;

  @Exclude()
  latitude: string;

  @Exclude()
  longitude: string;

  @Exclude()
  isHighlighted?: boolean;

  @Exclude()
  createdAt: Date;

  @Exclude()
  updatedAt: Date;

  @Exclude()
  deletedAt: Date;
}
