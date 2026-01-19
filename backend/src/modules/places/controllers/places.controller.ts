import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { DisambiguateDto } from '../dtos/places.dto';
import { DisambiguationService } from '../disambiguation.service';
import { GooglePlacesService } from '../google-places.service';
import { PlaceSearchService } from '../place-search.service';

@Controller('places')
export class PlacesController {
  constructor(
    private readonly placeSearch: PlaceSearchService,
    private readonly google: GooglePlacesService,
    private readonly disambiguation: DisambiguationService,
  ) {}

  @Get('search')
  async search(
    @Query('query') query: string,
    @Query('lat') lat: string | undefined,
    @Query('lng') lng: string | undefined,
    @Query('radius') radius: string | undefined,
    @Query('type') type: string | undefined,
    @Query('limit') limit: string | undefined,
  ) {
    const location = lat != null && lng != null ? { lat: parseFloat(lat), lng: parseFloat(lng) } : { lat: 0, lng: 0 };
    const radiusM = radius ? parseInt(radius, 10) : 10000;
    const limitN = limit ? parseInt(limit, 10) : 10;
    const list = await this.placeSearch.searchPlaces(query, location, radiusM, limitN);
    return { places: list };
  }

  @Post('disambiguate')
  async disambiguate(@Body() dto: DisambiguateDto) {
    return this.disambiguation.disambiguate({
      query: dto.query,
      candidates: dto.candidates,
      context: dto.context,
    });
  }

  @Get('nearby')
  async nearby(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('category') category: string,
    @Query('radius') radius: string | undefined,
    @Query('limit') limit: string | undefined,
  ) {
    const location = { lat: parseFloat(lat), lng: parseFloat(lng) };
    const radiusM = radius ? parseInt(radius, 10) : 5000;
    const limitN = limit ? parseInt(limit, 10) : 10;
    const list = await this.google.nearby(location, category, radiusM, limitN);
    return { places: list };
  }

  @Get('autocomplete')
  async autocomplete(
    @Query('input') input: string,
    @Query('lat') lat: string | undefined,
    @Query('lng') lng: string | undefined,
  ) {
    const location = lat != null && lng != null ? { lat: parseFloat(lat), lng: parseFloat(lng) } : undefined;
    const predictions = await this.google.autocomplete(input, location);
    return { predictions };
  }

  @Get(':placeId')
  async getDetails(@Param('placeId') placeId: string) {
    const p = await this.google.getPlaceDetails(placeId);
    if (!p) throw new Error('Place not found');
    return {
      id: p.placeId,
      name: p.name,
      address: p.address ?? '',
      location: p.location,
      types: p.types ?? [],
      rating: p.rating,
      reviewCount: p.reviewCount,
      isOpen: p.isOpen,
    };
  }
}
