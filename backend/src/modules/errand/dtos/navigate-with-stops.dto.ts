import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';

class LatLngDto {
  @IsNumber() lat: number;
  @IsNumber() lng: number;
}

class DestinationDto {
  @IsString() name: string;
  @IsOptional()
  @ValidateNested()
  @Type(() => LatLngDto)
  location?: LatLngDto;
}

class StopDto {
  @IsString() name: string;
  @IsOptional() @IsString() category?: string;
}

export class NavigateWithStopsDto {
  @ValidateNested()
  @Type(() => LatLngDto)
  @IsObject()
  origin: LatLngDto;

  @ValidateNested()
  @Type(() => DestinationDto)
  @IsObject()
  destination: DestinationDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StopDto)
  stops: StopDto[];

  @IsOptional()
  @IsObject()
  preferences?: Record<string, unknown>;
}
