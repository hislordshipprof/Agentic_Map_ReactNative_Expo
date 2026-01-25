import { Module } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { MapsModule } from '../maps/maps.module';
import { PlacesModule } from '../places/places.module';
import { ErrandController } from './controllers/errand.controller';
import { ClusterService } from './services/cluster.service';
import { DetourBufferService } from './services/detour-buffer.service';
import { ErrandService } from './services/errand.service';
import { EntityResolverService } from './services/entity-resolver.service';
import { OptimizationService } from './services/optimization.service';
import { RouteBuilderService } from './services/route-builder.service';
import { RouteCorridorService } from './services/route-corridor.service';

@Module({
  imports: [MapsModule, PlacesModule],
  controllers: [ErrandController],
  providers: [
    AuthGuard,
    ClusterService,
    DetourBufferService,
    OptimizationService,
    EntityResolverService,
    RouteBuilderService,
    RouteCorridorService,
    ErrandService,
  ],
  exports: [
    ClusterService,
    DetourBufferService,
    OptimizationService,
    EntityResolverService,
    RouteBuilderService,
    RouteCorridorService,
    ErrandService,
  ],
})
export class ErrandModule {}
