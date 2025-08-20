import { Expose, Transform } from 'class-transformer';

export class ReverseGeocodeDto {
  @Expose()
  latitude: string;

  @Expose()
  longitude: string;

  @Transform(({ obj }) => `${obj.state}، ${obj.city ?? obj.county}`)
  @Expose()
  city: string;

  @Transform(({ obj }) => obj.route_name)
  @Expose()
  routeName: string;
}