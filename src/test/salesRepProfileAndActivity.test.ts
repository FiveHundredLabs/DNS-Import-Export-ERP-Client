import { describe, it, expect, beforeEach } from 'vitest';
import { canAccessRoute } from '../rules/permissions';
import { authService } from '../services/AuthService';
import { orderActivityService } from '../services/OrderActivityService';

describe('Sales Representative — Profile Management & Personal Activity Log Access', () => {
  beforeEach(() => {
    // Login as Kasun Wickramasinghe (SALES_REP)
    authService.loginAs('usr-106');
  });

  it('authorizes SALES_REP role to access /profile without Access Denied', () => {
    expect(canAccessRoute('SALES_REP', '/profile')).toBe(true);
    expect(canAccessRoute('SALES_REP', '/profile/edit')).toBe(true);
  });

  it('allows Sales Representative to change their profile photo and birthday', () => {
    const newAvatar = 'https://images.unsplash.com/custom-rep-photo.jpg';
    const newBirthday = '1994-08-22';

    const updatedUser = authService.updateProfile({
      avatarUrl: newAvatar,
      birthDate: newBirthday,
    });

    expect(updatedUser.avatarUrl).toBe(newAvatar);
    expect(updatedUser.birthDate).toBe(newBirthday);
    expect(authService.getCurrentUser()?.birthDate).toBe(newBirthday);
    expect(authService.getCurrentUser()?.avatarUrl).toBe(newAvatar);
  });

  it('retrieves user personal activity log and audit history for SALES_REP', async () => {
    const currentUser = authService.getCurrentUser()!;
    expect(currentUser.role).toBe('SALES_REP');

    const activities = await orderActivityService.getUserActivityLog(currentUser.id, currentUser.role);

    expect(Array.isArray(activities)).toBe(true);
    // Activities should be scoped to this sales rep or general team actions
    if (activities.length > 0) {
      const first = activities[0];
      expect(first.id).toBeDefined();
      expect(first.timestamp).toBeDefined();
      expect(first.category).toBeDefined();
      expect(first.title).toBeDefined();
    }
  });
});
