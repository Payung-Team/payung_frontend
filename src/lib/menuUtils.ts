/**
 * Menu utility functions for filtering and processing dynamic menus
 */

import type { DynamicMenuTemplate, FilteredMenu, MenuItem, UserRoleType } from '../types/menu';

/**
 * Convert numeric role (1, 2, 3) to string role (patient, caregiver, admin)
 */
export function convertNumericRole(roleNum: number | null): UserRoleType | null {
  const roleMap: { [key: number]: UserRoleType } = {
    1: 'patient',
    2: 'caregiver',
    3: 'admin',
  };
  return roleNum ? roleMap[roleNum] : null;
}

/**
 * Check if user has permission to view a menu item
 */
export function hasMenuPermission(userRole: UserRoleType, allowedRoles: UserRoleType[]): boolean {
  return allowedRoles.includes(userRole);
}

/**
 * Filter menu items based on user role
 */
export function filterMenuItems(items: MenuItem[], userRole: UserRoleType): MenuItem[] {
  return items.filter((item) => hasMenuPermission(userRole, item.allowedRoles));
}

/**
 * Filter entire menu template based on user role
 */
export function filterMenuTemplate(
  template: DynamicMenuTemplate,
  userRole: UserRoleType
): FilteredMenu {
  const filteredNavigation = filterMenuItems(template.navigation, userRole);
  const filteredSidebarExtras = template.sidebarExtras
    ? filterMenuItems(template.sidebarExtras, userRole)
    : undefined;
  const filteredAvatar = template.avatar ? filterMenuItems(template.avatar, userRole) : undefined;

  // Extract available actions for the role
  const availableActions = filteredNavigation
    .concat(filteredSidebarExtras || [])
    .concat(filteredAvatar || [])
    .filter((item) => item.type === 'action' || item.type === 'navigation')
    .map((item) => item.id);

  return {
    menuId: template.menuId,
    menuTitle: template.menuTitle,
    description: template.description,
    navigation: filteredNavigation,
    sidebarExtras: filteredSidebarExtras,
    avatar: filteredAvatar,
    availableActions,
  };
}

/**
 * Get menu item by ID
 */
export function getMenuItemById(items: MenuItem[], itemId: string): MenuItem | undefined {
  return items.find((item) => item.id === itemId);
}

/**
 * Check if a menu item is a navigation item
 */
export function isNavigationItem(item: MenuItem): boolean {
  return item.type === 'navigation';
}

/**
 * Check if a menu item is an action item
 */
export function isActionItem(item: MenuItem): boolean {
  return item.type === 'action';
}

/**
 * Generate breadcrumbs from menu navigation
 */
export function getBreadcrumbs(
  items: MenuItem[],
  currentRoute: string
): Array<{ label: string; route?: string }> {
  const breadcrumbs: Array<{ label: string; route?: string }> = [
    { label: 'Home', route: '/' },
  ];

  const findItem = (itemList: MenuItem[]): MenuItem | undefined => {
    for (const item of itemList) {
      if (item.type === 'navigation' && item.route === currentRoute) {
        return item;
      }
    }
    return undefined;
  };

  const item = findItem(items);
  if (item && item.type === 'navigation') {
    breadcrumbs.push({
      label: item.label,
      route: item.route,
    });
  }

  return breadcrumbs;
}
