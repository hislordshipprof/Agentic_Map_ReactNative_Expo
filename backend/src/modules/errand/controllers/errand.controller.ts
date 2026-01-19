import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { NavigateWithStopsDto } from '../dtos/navigate-with-stops.dto';
import { ErrandService } from '../services/errand.service';

@Controller('errand')
export class ErrandController {
  constructor(private readonly errand: ErrandService) {}

  @Get('suggest-stops-on-route')
  async suggestStopsOnRoute(
    @Query('originLat') originLat: string,
    @Query('originLng') originLng: string,
    @Query('destinationLat') destinationLat: string,
    @Query('destinationLng') destinationLng: string,
    @Query('categories') categoriesStr: string | undefined,
    @Query('maxDetourPercent') _maxDetourPercent: string | undefined,
    @Query('limit') limitStr: string | undefined,
  ) {
    const origin = { lat: parseFloat(originLat), lng: parseFloat(originLng) };
    const destination = { lat: parseFloat(destinationLat), lng: parseFloat(destinationLng) };
    const categories = categoriesStr ? categoriesStr.split(',').map((s) => s.trim()) : ['coffee', 'gas', 'grocery'];
    const limit = limitStr ? parseInt(limitStr, 10) : 10;
    return this.errand.suggestStopsOnRoute(origin, destination, categories, limit);
  }

  @Post('navigate-with-stops')
  async navigateWithStops(@Body() dto: NavigateWithStopsDto) {
    const result = await this.errand.navigateWithStops({
      origin: dto.origin,
      destination: {
        name: dto.destination.name,
        location: dto.destination.location,
      },
      stops: dto.stops.map((s) => ({ name: s.name, category: s.category })),
      anchors: [],
    });
    return { route: result.route, excludedStops: result.excludedStops };
  }

  @Post('recalculate')
  async recalculate(
    @Body() dto: { origin: { lat: number; lng: number }; destination: { lat: number; lng: number }; stops: Array<{ placeId: string; lat: number; lng: number }> },
  ) {
    const route = await this.errand.recalculate(dto.origin, dto.destination, dto.stops);
    return { route };
  }

  @Post('preview')
  async preview(
    @Body() dto: { origin: { lat: number; lng: number }; destination: { lat: number; lng: number }; stops: Array<{ placeId: string; lat: number; lng: number }> },
  ) {
    return this.errand.preview(dto.origin, dto.destination, dto.stops);
  }
}
