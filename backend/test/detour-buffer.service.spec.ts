import { Test, TestingModule } from '@nestjs/testing';
import { DetourBufferService } from '../src/modules/errand/services/detour-buffer.service';

describe('DetourBufferService', () => {
  let service: DetourBufferService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DetourBufferService],
    }).compile();
    service = module.get(DetourBufferService);
  });

  describe('calculateBuffer', () => {
    it('short route (1.5 mi): 10%, clamped if below 400m', () => {
      const d = 2414; // ~1.5 mi
      expect(service.calculateBuffer(d)).toBe(400); // 241.4m -> clamp to 400
    });

    it('short route (2 mi): 10% = 323m -> clamp to 400m', () => {
      expect(service.calculateBuffer(3219)).toBe(400);
    });

    it('medium route (10 mi): 7% ≈ 1126m', () => {
      expect(service.calculateBuffer(16093)).toBeCloseTo(1126.51, 1);
    });

    it('long route (20 mi): 5% = 1609m -> clamp to 1600m', () => {
      expect(service.calculateBuffer(32186)).toBe(1600);
    });
  });

  describe('getDetourStatus', () => {
    const buffer = 1000;

    it('0-50m extra -> NO_DETOUR', () => {
      expect(service.getDetourStatus(0, buffer)).toBe('NO_DETOUR');
      expect(service.getDetourStatus(50, buffer)).toBe('NO_DETOUR');
    });

    it('<=25% of buffer -> MINIMAL', () => {
      expect(service.getDetourStatus(100, buffer)).toBe('MINIMAL');
      expect(service.getDetourStatus(250, buffer)).toBe('MINIMAL');
    });

    it('26-75% of buffer -> ACCEPTABLE', () => {
      expect(service.getDetourStatus(260, buffer)).toBe('ACCEPTABLE');
      expect(service.getDetourStatus(750, buffer)).toBe('ACCEPTABLE');
    });

    it('>75% of buffer -> NOT_RECOMMENDED', () => {
      expect(service.getDetourStatus(760, buffer)).toBe('NOT_RECOMMENDED');
      expect(service.getDetourStatus(1000, buffer)).toBe('NOT_RECOMMENDED');
    });
  });

  describe('isWithinBudget', () => {
    it('returns true when extra <= budget', () => {
      expect(service.isWithinBudget(100, 500)).toBe(true);
      expect(service.isWithinBudget(500, 500)).toBe(true);
    });

    it('returns false when extra > budget', () => {
      expect(service.isWithinBudget(501, 500)).toBe(false);
    });
  });
});
