import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '@config/env';
import { RequestContextManager, RequestUser, UserRole } from '@core/context/request-context';
import { UnauthorizedError } from '@core/errors/app-error';

interface JwtPayload {
  sub: string;
  role: UserRole;
  panchayatId?: string | null;
  wardId?: string | null;
  blockId?: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: RequestUser;
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Authentication required. Missing Bearer token.'));
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    const user: RequestUser = {
      id: decoded.sub,
      role: decoded.role,
      panchayatId: decoded.panchayatId,
      wardId: decoded.wardId,
      blockId: decoded.blockId,
    };

    req.user = user;
    RequestContextManager.setContext({ user });
    next();
  } catch (err) {
    next(new UnauthorizedError('Invalid or expired authentication token.'));
  }
};
