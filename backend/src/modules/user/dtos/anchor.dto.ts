import { Type } from 'class-transformer';
import { IsNumber, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';

class LatLngDto {
  @IsNumber() lat: number;
  @IsNumber() lng: number;
}

export class CreateAnchorDto {
  @IsString() name: string;
  @ValidateNested() @Type(() => LatLngDto) @IsObject() location: LatLngDto;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() type?: string;
}

export class UpdateAnchorDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @ValidateNested() @Type(() => LatLngDto) @IsObject() location?: LatLngDto;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() type?: string;
}
