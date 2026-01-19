import { plainToClass } from 'class-transformer';
import { IsNumber, IsOptional, IsString, validateSync } from 'class-validator';

class EnvDto {
  @IsString()
  DATABASE_URL: string;

  @IsOptional()
  @IsString()
  REDIS_URL?: string;

  @IsOptional()
  @IsString()
  GOOGLE_MAPS_API_KEY?: string;

  @IsOptional()
  @IsString()
  GOOGLE_PLACES_API_KEY?: string;

  @IsOptional()
  @IsString()
  GEMINI_API_KEY?: string;

  @IsOptional()
  @IsString()
  GEMINI_FAST_MODEL?: string;

  @IsOptional()
  @IsString()
  GEMINI_ADVANCED_MODEL?: string;

  @IsOptional()
  @IsNumber()
  PORT?: number;

  @IsOptional()
  @IsString()
  NODE_ENV?: string;

  @IsOptional()
  @IsString()
  JWT_SECRET?: string;
}

export function envValidation(config: Record<string, unknown>) {
  const validated = plainToClass(EnvDto, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, { whitelist: true });
  if (errors.length > 0) {
    const messages = errors.map((e) => Object.values(e.constraints ?? {})).flat();
    throw new Error(`Env validation failed: ${messages.join('; ')}`);
  }

  return validated;
}
