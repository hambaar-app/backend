import { Expose } from 'class-transformer';

export class AddressResponseDto {
  @Expose()
  id: string;

  @Expose()
  title?: string;

  @Expose()
  country?: string;

  @Expose()
  province: string;

  @Expose()
  city: string;

  @Expose()
  street: string;

  @Expose()
  details: string;

  @Expose()
  plate?: number;

  @Expose()
  postalCode?: string;

  @Expose()
  latitude: string;

  @Expose()
  longitude: string;

  @Expose()
  isHighlighted?: boolean;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  deletedAt: Date;
}
