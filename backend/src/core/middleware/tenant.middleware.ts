import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '@config/env';
import { RequestContextManager, RequestUser } from '@core/context/request-context';
import { BadRequestError, ForbiddenError } from '@core/errors/app-error';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const tenantMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const correlationId = (req.headers['x-correlation-id'] as string) || crypto.randomUUID();
  const headerPanchayatId = req.headers['x-panchayat-id'] as string | undefined;

  let user: RequestUser | undefined = req.user || RequestContextManager.getUser();

  // Extract user claims from Authorization header if present to enforce tenant boundaries upfront
  if (!user && req.headers.authorization?.startsWith('Bearer ')) {
    try {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, env.JWT_SECRET) as any;
      user = {
        id: decoded.sub,
        role: decoded.role,
        panchayatId: decoded.panchayatId,
        wardId: decoded.wardId,
        blockId: decoded.blockId,
      };
      req.user = user;
    } catch {}
  }

  // Initial context establishment
  RequestContextManager.run({ correlationId, user }, () => {
    // Check if route is an unauthenticated public route
    const isPublicRoute =
      req.path.startsWith('/health') ||
      req.path.startsWith('/api/v1/auth') ||
      req.path.startsWith('/api/v1/assisted/track') ||
      (req.path.startsWith('/api/v1/schemes') && req.method === 'GET' && !req.path.includes('/applications')) ||
      (req.path.match(/^\/api\/v1\/schemes\/[^/]+\/check-eligibility$/) !== null);

    if (isPublicRoute && !headerPanchayatId) {
      return next();
    }

    if (!headerPanchayatId) {
      return next(new BadRequestError("Missing required 'X-Panchayat-ID' header."));
    }

    if (!UUID_REGEX.test(headerPanchayatId)) {
      return next(new BadRequestError("Invalid 'X-Panchayat-ID' format. Must be a valid UUID."));
    }

    // Check user tenant match if authenticated
    const activeUser = req.user || RequestContextManager.getUser();
    if (activeUser) {
      if (activeUser.role === 'SYSTEM_ADMIN') {
        // System admin can access any panchayat
      } else if (activeUser.role === 'BLOCK_OFFICER') {
        // Block officer can supervise panchayats within block
      } else if (activeUser.panchayatId && activeUser.panchayatId !== headerPanchayatId) {
        return next(
          new ForbiddenError(
            `Cross-panchayat access denied. User belongs to '${activeUser.panchayatId}', cannot access '${headerPanchayatId}'.`
          )
        );
      }
    }

    // Set active tenant in context
    RequestContextManager.setContext({ panchayatId: headerPanchayatId, user: activeUser });
    res.setHeader('X-Correlation-ID', correlationId);
    next();
  });
};
