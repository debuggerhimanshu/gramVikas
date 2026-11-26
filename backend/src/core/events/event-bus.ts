import crypto from 'crypto';
import { DomainEvent } from './domain-event';
import { EventPayloadMap } from './event-registry';
import { logger } from '@core/utils/logger';
import { RequestContextManager } from '@core/context/request-context';

export type EventHandler<K extends keyof EventPayloadMap> = (
  event: DomainEvent<EventPayloadMap[K]>
) => Promise<void>;

export interface IEventBus {
  publish<K extends keyof EventPayloadMap>(
    eventName: K,
    panchayatId: string,
    payload: EventPayloadMap[K]
  ): Promise<void>;

  subscribe<K extends keyof EventPayloadMap>(
    eventName: K,
    handler: EventHandler<K>
  ): void;

  clearListeners(): void;
}

export class InProcessEventBus implements IEventBus {
  private handlers: Map<keyof EventPayloadMap, Array<EventHandler<any>>> = new Map();

  subscribe<K extends keyof EventPayloadMap>(
    eventName: K,
    handler: EventHandler<K>
  ): void {
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, []);
    }
    this.handlers.get(eventName)!.push(handler);
    logger.debug(`Registered event subscriber for '${String(eventName)}'`);
  }

  async publish<K extends keyof EventPayloadMap>(
    eventName: K,
    panchayatId: string,
    payload: EventPayloadMap[K]
  ): Promise<void> {
    const context = RequestContextManager.getContext();
    const event: DomainEvent<EventPayloadMap[K]> = {
      eventId: crypto.randomUUID(),
      eventName: String(eventName),
      occurredAt: new Date(),
      panchayatId,
      correlationId: context?.correlationId || crypto.randomUUID(),
      payload,
    };

    const listeners = this.handlers.get(eventName) || [];
    logger.info(`Publishing event '${String(eventName)}' [${event.eventId}] to ${listeners.length} listener(s)`, {
      panchayatId,
    });

    for (const listener of listeners) {
      try {
        await listener(event);
      } catch (err) {
        // Error boundary: handler failure does not crash the caller but is logged for audit
        logger.error(`Error in event listener for '${String(eventName)}'`, {
          eventId: event.eventId,
          error: (err as Error).message,
          stack: (err as Error).stack,
        });
      }
    }
  }

  clearListeners(): void {
    this.handlers.clear();
  }
}

export const eventBus: IEventBus = new InProcessEventBus();
