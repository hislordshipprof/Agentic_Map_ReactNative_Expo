import { Module } from '@nestjs/common';
import { MapsModule } from '../maps/maps.module';
import { PlacesModule } from '../places/places.module';
import { ErrandController } from './controllers/errand.controller';
import { DetourBufferService } from './services/detour-buffer.service';
import { ErrandService } from './services/errand.service';
import { EntityResolverService } from './services/entity-resolver.service';
import { OptimizationService } from './services/optimization.service';
import { RouteBuilderService } from './services/route-builder.service';

@Module({
  imports: [MapsModule, PlacesModule],
  controllers: [ErrandController],
  providers: [DetourBufferService, OptimizationService, EntityResolverService, RouteBuilderService, ErrandService],
  exports: [DetourBufferService, OptimizationService, EntityResolverService, RouteBuilderService, ErrandService],
})
export class ErrandModule {}
