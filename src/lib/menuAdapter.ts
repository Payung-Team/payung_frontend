/**
 * Menu adapter - converts MenuItem from JSON menu system to NavItem for Navigation component
 * Handles icon mapping and route translation
 */

import type { MenuItem, NavigationMenuItem } from '../types/menu';

export interface NavItem {
  path: string;
  label: string;
  icon: string;
}

/**
 * Icon mapping from menu icons (Ionic icon names) to component icons
 */
const iconMap: { [key: string]: string } = {
  'home-outline': 'home',
  'search-outline': 'search',
  'calendar-outline': 'calendar_today',
  'chatbubble-outline': 'chat',
  'checkmark-circle-outline': 'verified_user',
  'person-outline': 'person',
  'create-outline': 'edit',
  'log-out-outline': 'logout',
  'settings-outline': 'settings',
  'document-text-outline': 'description',
  'sliders-outline': 'tune',
};

/**
 * Convert a menu icon name to component icon name
 */
export function convertIcon(ionicIconName: string): string {
  return iconMap[ionicIconName] || ionicIconName;
}

/**
 * Convert a single MenuItem to NavItem
 * Only processes navigation items, skips action items and dividers
 */
export function menuItemToNavItem(item: MenuItem): NavItem | null {
  if (item.type !== 'navigation') {
    return null;
  }

  const navItem = item as NavigationMenuItem;
  return {
    path: navItem.route,
    label: navItem.label,
    icon: convertIcon(navItem.icon),
  };
}

/**
 * Convert array of MenuItems to NavItems
 * Filters out non-navigation items automatically
 */
export function menuItemsToNavItems(items: MenuItem[]): NavItem[] {
  return items
    .map((item) => menuItemToNavItem(item))
    .filter((item): item is NavItem => item !== null);
}
