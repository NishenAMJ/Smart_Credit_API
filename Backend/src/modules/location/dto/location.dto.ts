import { IsIn, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export const LOCATION_VISIBILITIES = ['hidden', 'approximate', 'exact'] as const;
export type LocationVisibility = (typeof LOCATION_VISIBILITIES)[number];

export class UpdateLocationDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  district?: string;

  @IsIn(LOCATION_VISIBILITIES)
  @IsOptional()
  visibility?: LocationVisibility;
}

export type NearbyQuery = {
  lat?: string;
  lng?: string;
  radiusKm?: string;
  limit?: string;
};
