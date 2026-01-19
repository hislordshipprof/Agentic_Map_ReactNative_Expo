import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';

class LatLngDto {
  @IsNumber() lat: number;
  @IsNumber() lng: number;
}

class DisambiguateContextDto {
  @IsOptional() @ValidateNested() @Type(() => LatLngDto) origin?: LatLngDto;
  @IsOptional() @ValidateNested() @Type(() => LatLngDto) destination?: LatLngDto;
}

export class DisambiguateDto {
  @IsString() query: string;
  @IsArray() @IsString({ each: true }) candidates: string[];
  @IsOptional() @ValidateNested() @Type(() => DisambiguateContextDto) context?: DisambiguateContextDto;
}
