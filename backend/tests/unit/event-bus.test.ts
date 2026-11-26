import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InProcessEventBus } from '../../src/core/events/event-bus';

describe('In-Process Domain Event Bus', () => {
  let eventBus: InProcessEventBus;
  const panchayatId = 'a0000000-0000-0000-0000-000000000001';

  beforeEach(() => {
    eventBus = new InProcessEventBus();
  });

  it('should publish ASSET_DAMAGED event and deliver to registered handler', async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    eventBus.subscribe('ASSET_DAMAGED', handler);

    const payload = {
      assetId: 'ast-123',
      assetUid: 'AST-W1-BW-001',
      assetCategory: 'TUBE_WELL_BOREWELL',
      wardId: 'ward-1',
      reportedByUserId: 'usr-1',
      description: 'Motor burned out',
      geoCoordinates: { latitude: 18.354, longitude: 73.861 },
    };

    await eventBus.publish('ASSET_DAMAGED', panchayatId, payload);

    expect(handler).toHaveBeenCalledTimes(1);
    const deliveredEvent = handler.mock.calls[0][0];
    expect(deliveredEvent.eventName).toBe('ASSET_DAMAGED');
    expect(deliveredEvent.panchayatId).toBe(panchayatId);
    expect(deliveredEvent.payload).toEqual(payload);
    expect(deliveredEvent).toHaveProperty('eventId');
    expect(deliveredEvent).toHaveProperty('occurredAt');
  });

  it('should support multiple subscribers for the same event', async () => {
    const handler1 = vi.fn().mockResolvedValue(undefined);
    const handler2 = vi.fn().mockResolvedValue(undefined);

    eventBus.subscribe('COMPLAINT_CLUSTERED', handler1);
    eventBus.subscribe('COMPLAINT_CLUSTERED', handler2);

    await eventBus.publish('COMPLAINT_CLUSTERED', panchayatId, {
      serviceType: 'DRINKING_WATER',
      wardId: 'ward-1',
      clusterWindowHours: 48,
      complaintCount: 5,
      ticketIds: ['t1', 't2', 't3', 't4', 't5'],
    });

    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).toHaveBeenCalledTimes(1);
  });

  it('should contain error boundary: subscriber failure does not throw or crash bus', async () => {
    const failingHandler = vi.fn().mockRejectedValue(new Error('Downstream handler crashed'));
    const successHandler = vi.fn().mockResolvedValue(undefined);

    eventBus.subscribe('CITIZEN_VERIFICATION_SUBMITTED', failingHandler);
    eventBus.subscribe('CITIZEN_VERIFICATION_SUBMITTED', successHandler);

    await expect(
      eventBus.publish('CITIZEN_VERIFICATION_SUBMITTED', panchayatId, {
        verificationId: 'v-1',
        projectId: 'p-1',
        verifiedByUserId: 'u-1',
        rating: 'SATISFACTORY',
        auditVarianceFlag: false,
        photoUrls: ['http://photo1.jpg'],
        observations: 'Good work',
      })
    ).resolves.not.toThrow();

    expect(failingHandler).toHaveBeenCalledTimes(1);
    expect(successHandler).toHaveBeenCalledTimes(1);
  });
});
