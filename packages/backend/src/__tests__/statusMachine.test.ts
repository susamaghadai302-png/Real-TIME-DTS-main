import { describe, it, expect } from 'vitest';
import { DeliveryStatus, VALID_STATUS_TRANSITIONS } from '@dts/shared';

describe('Delivery Status State Machine', () => {
  describe('Valid transitions', () => {
    it('ORDER_CREATED can transition to DRIVER_ASSIGNED', () => {
      const transitions = VALID_STATUS_TRANSITIONS[DeliveryStatus.ORDER_CREATED];
      expect(transitions).toContain(DeliveryStatus.DRIVER_ASSIGNED);
    });

    it('ORDER_CREATED can be CANCELLED', () => {
      const transitions = VALID_STATUS_TRANSITIONS[DeliveryStatus.ORDER_CREATED];
      expect(transitions).toContain(DeliveryStatus.CANCELLED);
    });

    it('DRIVER_ASSIGNED can be DRIVER_ACCEPTED', () => {
      const transitions = VALID_STATUS_TRANSITIONS[DeliveryStatus.DRIVER_ASSIGNED];
      expect(transitions).toContain(DeliveryStatus.DRIVER_ACCEPTED);
    });

    it('DRIVER_ACCEPTED can transition to DRIVER_PICKED_UP', () => {
      const transitions = VALID_STATUS_TRANSITIONS[DeliveryStatus.DRIVER_ACCEPTED];
      expect(transitions).toContain(DeliveryStatus.DRIVER_PICKED_UP);
    });

    it('IN_TRANSIT can transition to NEAR_DESTINATION', () => {
      const transitions = VALID_STATUS_TRANSITIONS[DeliveryStatus.IN_TRANSIT];
      expect(transitions).toContain(DeliveryStatus.NEAR_DESTINATION);
    });

    it('IN_TRANSIT can become DELAYED', () => {
      const transitions = VALID_STATUS_TRANSITIONS[DeliveryStatus.IN_TRANSIT];
      expect(transitions).toContain(DeliveryStatus.DELAYED);
    });

    it('NEAR_DESTINATION can be DELIVERED', () => {
      const transitions = VALID_STATUS_TRANSITIONS[DeliveryStatus.NEAR_DESTINATION];
      expect(transitions).toContain(DeliveryStatus.DELIVERED);
    });

    it('DELIVERED is terminal (no transitions)', () => {
      const transitions = VALID_STATUS_TRANSITIONS[DeliveryStatus.DELIVERED];
      expect(transitions).toHaveLength(0);
    });

    it('CANCELLED is terminal (no transitions)', () => {
      const transitions = VALID_STATUS_TRANSITIONS[DeliveryStatus.CANCELLED];
      expect(transitions).toHaveLength(0);
    });
  });

  describe('Invalid transitions', () => {
    it('ORDER_CREATED cannot jump to IN_TRANSIT', () => {
      const transitions = VALID_STATUS_TRANSITIONS[DeliveryStatus.ORDER_CREATED];
      expect(transitions).not.toContain(DeliveryStatus.IN_TRANSIT);
    });

    it('DELIVERED cannot go back to IN_TRANSIT', () => {
      const transitions = VALID_STATUS_TRANSITIONS[DeliveryStatus.DELIVERED];
      expect(transitions).not.toContain(DeliveryStatus.IN_TRANSIT);
    });

    it('CANCELLED cannot transition to DELIVERED', () => {
      const transitions = VALID_STATUS_TRANSITIONS[DeliveryStatus.CANCELLED];
      expect(transitions).not.toContain(DeliveryStatus.DELIVERED);
    });

    it('DRIVER_PICKED_UP cannot go back to ORDER_CREATED', () => {
      const transitions = VALID_STATUS_TRANSITIONS[DeliveryStatus.DRIVER_PICKED_UP];
      expect(transitions).not.toContain(DeliveryStatus.ORDER_CREATED);
    });
  });

  describe('Full delivery lifecycle', () => {
    it('should support the complete happy path lifecycle', () => {
      const lifecycle = [
        DeliveryStatus.ORDER_CREATED,
        DeliveryStatus.DRIVER_ASSIGNED,
        DeliveryStatus.DRIVER_ACCEPTED,
        DeliveryStatus.DRIVER_PICKED_UP,
        DeliveryStatus.IN_TRANSIT,
        DeliveryStatus.NEAR_DESTINATION,
        DeliveryStatus.DELIVERED,
      ];

      for (let i = 0; i < lifecycle.length - 1; i++) {
        const from = lifecycle[i];
        const to = lifecycle[i + 1];
        const valid = VALID_STATUS_TRANSITIONS[from].includes(to);
        expect(valid, `${from} -> ${to} should be valid`).toBe(true);
      }
    });
  });
});
