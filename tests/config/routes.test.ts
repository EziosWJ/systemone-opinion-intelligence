import { describe, expect, it } from 'vitest';
import { getNavigation, getNavigationRoute, matchRoute, routeDefinitions } from '../../src/config/routes';
describe('SystemOne routes', () => {
  it('contains no legacy business paths', () => {
    expect(routeDefinitions.some((route) => /^\/(customers|projects|orders|users)(\/|$)/.test(route.path))).toBe(false);
  });
  it('provides five grouped business menus', () => {
    expect(getNavigation().groups.map((group) => group.label)).toEqual(['数据采集','AI 研判','专题分析','报告中心','系统设置']);
  });
  it('resolves nested detail routes to their nav parent', () => {
    expect(matchRoute('/topics/demo')?.path).toBe('/topics/:id');
    expect(getNavigationRoute('/topics/demo')?.path).toBe('/topics');
  });
});
