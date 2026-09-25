import { Router, Request, Response } from 'express';
import type { AdminUser } from '../../src/types.js';
import { ServerAdminAccount } from '../initialData.js';
import {
  adminAccounts,
  activeSessions,
  systemConfig,
  comparePassword,
  initOrLoadDataAsync,
  verifyAnyAdminPermission,
  dataStore
} from '../dataStore.js';
import { broadcastRealtimeState } from './realtime.js';

export const authRouter = Router();

// 2. Admin Authentication Login
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    await initOrLoadDataAsync(false);
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: '请输入用户名和登录密码' });
    }

    const trimmedUser = String(username).trim();
    const cleanPassword = String(password).trim();
    const targetAccount = adminAccounts.find(a => a.username.toLowerCase() === trimmedUser.toLowerCase());

    if (targetAccount) {
      const isMatch = comparePassword(cleanPassword, targetAccount.password) ||
        (targetAccount.role === 'superadmin' && comparePassword(cleanPassword, systemConfig.adminPassword || 'bethel2026'));

      if (isMatch) {
        const userSession: AdminUser = {
          username: targetAccount.username,
          displayName: targetAccount.displayName,
          role: targetAccount.role,
          assignedClassId: targetAccount.assignedClassId,
          token: `btl_session_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
        };
        activeSessions.set(userSession.token, userSession);
        return res.json({ success: true, user: userSession, message: `欢迎登录，${userSession.displayName}！` });
      }
      return res.status(401).json({ error: '密码错误，请核对后重试' });
    }

    // Generic match if user enters custom username with correct admin password
    if (comparePassword(cleanPassword, systemConfig.adminPassword || 'bethel2026')) {
      const userSession: AdminUser = {
        username: trimmedUser,
        displayName: `伯特利教会管理员 (${trimmedUser})`,
        role: 'superadmin',
        token: `btl_session_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
      };
      activeSessions.set(userSession.token, userSession);
      return res.json({ success: true, user: userSession, message: '登录成功！' });
    }

    return res.status(401).json({ error: '账号不存在或密码错误，请核对后重试' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 10. Account Management
authRouter.get('/accounts', async (req: Request, res: Response) => {
  try {
    const auth = verifyAnyAdminPermission(req);
    if (!auth.allowed) {
      return res.status(403).json({ error: auth.message || '请先登录后台管理账号' });
    }

    const accs = await dataStore.getAdminAccounts();

    res.json({
      success: true,
      accounts: accs.map(a => ({
        id: a.id,
        username: a.username,
        displayName: a.displayName,
        role: a.role,
        assignedClassId: a.assignedClassId,
        createdAt: a.createdAt
      }))
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

authRouter.post('/accounts', async (req: Request, res: Response) => {
  try {
    await initOrLoadDataAsync(true);
    const auth = verifyAnyAdminPermission(req);
    if (!auth.allowed) {
      return res.status(403).json({ error: auth.message || '请先登录后台管理账号' });
    }

    const { username, displayName, role, password, assignedClassId } = req.body;
    if (!username || !displayName) {
      return res.status(400).json({ error: '用户名和显示称谓不能为空' });
    }

    const cleanUsername = String(username).trim().toLowerCase();
    const cleanDisplayName = String(displayName).trim();
    const cleanRole = (role === 'superadmin' || role === 'teacher' || role === 'fellowship_leader') 
      ? role 
      : 'teacher';
    const cleanAssignedClassId = cleanRole === 'superadmin' ? undefined : (assignedClassId ? String(assignedClassId).trim() : undefined);

    const existingIndex = adminAccounts.findIndex(a => a.username.toLowerCase() === cleanUsername);

    if (existingIndex >= 0) {
      const existing = adminAccounts[existingIndex];
      const finalRole = cleanUsername === 'admin' ? 'superadmin' : cleanRole;
      
      adminAccounts[existingIndex] = {
        ...existing,
        displayName: cleanDisplayName,
        role: finalRole,
        assignedClassId: finalRole === 'superadmin' ? undefined : cleanAssignedClassId,
        password: password ? String(password).trim() : existing.password
      };

      if (cleanUsername === 'admin' && password) {
        systemConfig.adminPassword = String(password).trim();
      }

      await dataStore.saveAdminAccount(adminAccounts[existingIndex]);
      broadcastRealtimeState('accounts_updated');

      return res.json({
        success: true,
        message: `账号【${cleanUsername}】信息已成功更新！`,
        accounts: adminAccounts.map(a => ({
          id: a.id,
          username: a.username,
          displayName: a.displayName,
          role: a.role,
          assignedClassId: a.assignedClassId,
          createdAt: a.createdAt
        }))
      });
    } else {
      if (!password || String(password).trim().length < 4) {
        return res.status(400).json({ error: '新建账号密码不能为空且不少于4位字符' });
      }

      const newAccount: ServerAdminAccount = {
        id: `acc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        username: cleanUsername,
        displayName: cleanDisplayName,
        role: cleanRole,
        assignedClassId: cleanRole === 'superadmin' ? undefined : cleanAssignedClassId,
        password: String(password).trim(),
        createdAt: new Date().toISOString().split('T')[0]
      };

      await dataStore.saveAdminAccount(newAccount);
      broadcastRealtimeState('accounts_updated');

      return res.json({
        success: true,
        message: `新账号【${cleanUsername}】已成功创建！`,
        accounts: adminAccounts.map(a => ({
          id: a.id,
          username: a.username,
          displayName: a.displayName,
          role: a.role,
          assignedClassId: a.assignedClassId,
          createdAt: a.createdAt
        }))
      });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

authRouter.post('/accounts/password', async (req: Request, res: Response) => {
  try {
    await initOrLoadDataAsync(true);
    const auth = verifyAnyAdminPermission(req);
    if (!auth.allowed) {
      return res.status(403).json({ error: auth.message || '请先登录后台管理账号' });
    }

    const { username, newPassword } = req.body;
    if (!username || !newPassword) {
      return res.status(400).json({ error: '请提供用户名和新密码' });
    }

    const cleanUsername = String(username).trim().toLowerCase();
    const cleanPassword = String(newPassword).trim();
    if (cleanPassword.length < 4) {
      return res.status(400).json({ error: '新密码长度至少需要4个字符' });
    }

    const target = adminAccounts.find(a => a.username.toLowerCase() === cleanUsername);
    if (!target) {
      return res.status(404).json({ error: `未找到账号【${username}】` });
    }

    await dataStore.updateAccountPassword(cleanUsername, cleanPassword);
    broadcastRealtimeState('accounts_updated');

    res.json({
      success: true,
      message: `账号【${target.displayName}】密码已成功修改！`,
      accounts: adminAccounts.map(a => ({
        id: a.id,
        username: a.username,
        displayName: a.displayName,
        role: a.role,
        assignedClassId: a.assignedClassId,
        createdAt: a.createdAt
      }))
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

authRouter.delete('/accounts/:username', async (req: Request, res: Response) => {
  try {
    const targetUsername = String(req.params.username).trim().toLowerCase();
    await initOrLoadDataAsync(true);
    const auth = verifyAnyAdminPermission(req);
    if (!auth.allowed) {
      return res.status(403).json({ error: auth.message || '请先登录后台管理账号' });
    }

    if (targetUsername === 'admin') {
      return res.status(400).json({ error: '禁止删除系统根总管理员账号（admin）' });
    }

    const deleted = await dataStore.deleteAdminAccount(targetUsername);
    if (!deleted) {
      return res.status(404).json({ error: `未找到账号【${targetUsername}】` });
    }
    
    broadcastRealtimeState('accounts_updated');

    res.json({
      success: true,
      message: `账号【${deleted.displayName} (${deleted.username})】已成功删除！`,
      accounts: adminAccounts.map(a => ({
        id: a.id,
        username: a.username,
        displayName: a.displayName,
        role: a.role,
        assignedClassId: a.assignedClassId,
        createdAt: a.createdAt
      }))
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
