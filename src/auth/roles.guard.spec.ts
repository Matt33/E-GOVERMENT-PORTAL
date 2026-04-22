import { RolesGuard } from './roles.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('should allow access when no roles are required', () => {
    jest.spyOn(reflector, 'get').mockReturnValue(null);
    const context = {
      getHandler: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user: {} }),
      }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access when user has required role', () => {
    jest.spyOn(reflector, 'get').mockReturnValue(['citizen']);
    const context = {
      getHandler: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({
          user: { realm_access: { roles: ['citizen'] } },
        }),
      }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should deny access when user lacks required role', () => {
    jest.spyOn(reflector, 'get').mockReturnValue(['supervisor']);
    const context = {
      getHandler: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({
          user: { realm_access: { roles: ['citizen'] } },
        }),
      }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(context)).toBe(false);
  });
});
