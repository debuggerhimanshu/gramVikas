import { AsyncLocalStorage } from 'async_hooks';

export type UserRole =
  | 'CITIZEN'
  | 'ASSISTED_OPERATOR'
  | 'WARD_MEMBER'
  | 'PANCHAYAT_SECRETARY'
  | 'SARPANCH'
  | 'BLOCK_OFFICER'
  | 'SYSTEM_ADMIN';

export interface RequestUser {
  id: string;
  role: UserRole;
  panchayatId?: string | null;
  wardId?: string | null;
  blockId?: string | null;
}

export interface RequestContext {
  correlationId: string;
  panchayatId?: string;
  user?: RequestUser;
}

const asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

export const RequestContextManager = {
  run<T>(context: RequestContext, callback: () => T): T {
    return asyncLocalStorage.run(context, callback);
  },

  getContext(): RequestContext | undefined {
    return asyncLocalStorage.getStore();
  },

  getPanchayatId(): string {
    const store = asyncLocalStorage.getStore();
    if (!store?.panchayatId) {
      throw new Error('Tenant context missing: No active panchayatId in request scope.');
    }
    return store.panchayatId;
  },

  getUser(): RequestUser | undefined {
    return asyncLocalStorage.getStore()?.user;
  },

  setContext(partial: Partial<RequestContext>): void {
    const store = asyncLocalStorage.getStore();
    if (store) {
      Object.assign(store, partial);
    }
  },
};
