import { Module } from '@nestjs/common';
import { PlacesController } from './controllers/places.controller';
import { DisambiguationService } from './disambiguation.service';
import { GooglePlacesService } from './google-places.service';
import { PlaceSearchService } from './place-search.service';

@Module({
  controllers: [PlacesController],
  providers: [GooglePlacesService, PlaceSearchService, DisambiguationService],
  exports: [GooglePlacesService, PlaceSearchService, DisambiguationService],
})
export class PlacesModule {}
