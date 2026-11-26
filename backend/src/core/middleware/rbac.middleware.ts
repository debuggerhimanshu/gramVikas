import { Request, Response, NextFunction } from 'express';
import { UserRole, RequestContextManager } from '@core/context/request-context';
import { ForbiddenError, UnauthorizedError } from '@core/errors/app-error';

export const authorize = (allowedRoles: UserRole[], options?: { allowBlockOfficerSupervision?: boolean }) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user || RequestContextManager.getUser();

    if (!user) {
      return next(new UnauthorizedError('Authentication required prior to authorization check.'));
    }

    // System admin has universal access
    if (user.role === 'SYSTEM_ADMIN') {
      return next();
    }

    // Check if user role is in the allowed roles list
    const hasRole = allowedRoles.includes(user.role);

    // Block officer supervisory read access check
    if (!hasRole && user.role === 'BLOCK_OFFICER' && (options?.allowBlockOfficerSupervision || req.method === 'GET')) {
      return next();
    }

    if (!hasRole) {
      return next(
        new ForbiddenError(
          `Access forbidden: Role '${user.role}' lacks permission for this action. Required: [${allowedRoles.join(', ')}]`
        )
      );
    }

    next();
  };
};
