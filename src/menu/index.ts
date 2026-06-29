/**
 * Export all menu-related utilities, types, and functions
 * Provides a single entry point for menu system imports
 */

// Types
export type {
  UserRoleType,
  MenuItemVariant,
  MenuItemType,
  BaseMenuItem,
  NavigationMenuItem,
  ActionMenuItem,
  DividerMenuItem,
  MenuItem,
  MenuSection,
  DynamicMenuTemplate,
  FilteredMenu,
  MenuConfig,
} from '../types/menu';

export {
  convertNumericRole,
  hasMenuPermission,
  filterMenuItems,
  filterMenuTemplate,
  getMenuItemById,
  isNavigationItem,
  isActionItem,
  getBreadcrumbs,
} from '../lib/menuUtils';

export {
  loadMenuTemplate,
  loadMenuTemplates,
  clearMenuCache,
  getCachedMenus,
} from '../lib/menuLoader';

export {
  menuItemToNavItem,
  menuItemsToNavItems,
  convertIcon,
  type NavItem,
} from '../lib/menuAdapter';

export { useMenuTemplate } from '../hooks/useMenuTemplate';
export { useFilteredMenu } from '../hooks/useFilteredMenu';
