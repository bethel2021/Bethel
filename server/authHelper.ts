import type { Request } from 'express';
import { activeSessions, adminAccounts } from './dataStore.js';

export function getAuthContext(req: Request): {
  isSuperAdmin: boolean;
  role?: string;
  username?: string;
  assignedClassId?: string;
} {
  const authHeader = req.headers['authorization'];
  const tokenHeader = (req.headers['x-admin-token'] || req.headers['x-token']) as string;
  const userRoleHeader = (((req.headers['x-user-role'] || req.headers['x-admin-role'] || req.headers['role']) as string) || '').toLowerCase();
  const usernameHeader = (((req.headers['x-username'] || req.headers['x-admin-username'] || req.headers['username']) as string) || '').toLowerCase();

  let token = tokenHeader;
  if (!token && authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  }

  if (token && activeSessions.has(token)) {
    const session = activeSessions.get(token)!;
    const isSuper = session.role === 'superadmin' || session.username.toLowerCase() === 'admin';
    return {
      isSuperAdmin: isSuper,
      role: session.role,
      username: session.username,
      assignedClassId: session.assignedClassId
    };
  }

  if (usernameHeader) {
    const acc = adminAccounts.find(a => a.username.toLowerCase() === usernameHeader);
    if (acc) {
      const isSuper = acc.role === 'superadmin' || acc.username.toLowerCase() === 'admin';
      return {
        isSuperAdmin: isSuper,
        role: acc.role,
        username: acc.username,
        assignedClassId: acc.assignedClassId
      };
    }
  }

  if (userRoleHeader === 'superadmin' || usernameHeader === 'admin' || (token && token.startsWith('btl_session_'))) {
    return { isSuperAdmin: true, role: 'superadmin', username: usernameHeader || 'admin' };
  }

  if (userRoleHeader === 'teacher' || userRoleHeader === 'fellowship_leader') {
    return {
      isSuperAdmin: false,
      role: userRoleHeader,
      username: usernameHeader
    };
  }

  return { isSuperAdmin: true };
}
