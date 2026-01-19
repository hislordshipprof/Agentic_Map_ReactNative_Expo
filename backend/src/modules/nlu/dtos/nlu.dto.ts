import { Type } from 'class-transformer';
import { IsNumber, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';

class LatLngDto {
  @IsNumber() lat: number;
  @IsNumber() lng: number;
}

class NluContextDto {
  @IsOptional() @IsString() previousIntent?: string;
  @IsOptional() @IsObject() previousEntities?: Record<string, unknown>;
  @IsOptional() @IsString() conversationId?: string;
}

export class NluProcessDto {
  @IsString() utterance: string;
  @IsOptional() @ValidateNested() @Type(() => LatLngDto) currentLocation?: LatLngDto;
  @IsOptional() @ValidateNested() @Type(() => NluContextDto) context?: NluContextDto;
}

export class EscalateDto {
  @IsString() utterance: string;
  @IsOptional()
  @IsObject()
  conversationHistory?: Array<{ role: string; content: string }>;
  @IsOptional() @ValidateNested() @Type(() => LatLngDto) currentLocation?: LatLngDto;
  @IsOptional() @IsObject() context?: Record<string, unknown>;
}
