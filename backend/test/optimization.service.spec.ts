import { Test, TestingModule } from '@nestjs/testing';
import { OptimizationService } from '../src/modules/errand/services/optimization.service';

describe('OptimizationService', () => {
  let service: OptimizationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OptimizationService],
    }).compile();
    service = module.get(OptimizationService);
  });

  it('orders two stops by nearest neighbor', () => {
    const start = { lat: 0, lng: 0 };
    const end = { lat: 0.01, lng: 0.01 };
    const stops = [
      { id: 'a', location: { lat: 0.005, lng: 0 } },
      { id: 'b', location: { lat: 0.003, lng: 0.003 } },
    ];
    const r = service.optimizeStopOrder(start, end, stops);
    expect(r.sequence).toContain('start');
    expect(r.sequence).toContain('end');
    expect(r.sequence).toContain('a');
    expect(r.sequence).toContain('b');
    expect(r.legs.length).toBe(3);
    expect(r.totalDistanceM).toBeGreaterThan(0);
  });

  it('metersToMiles converts correctly', () => {
    expect(service.metersToMiles(1609.34)).toBeCloseTo(1, 2);
  });
});
