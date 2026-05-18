/**
 * Type definitions for dynamic menu system
 */

export type UserRoleType = 'patient' | 'caregiver' | 'admin' | 'super_admin';
export type MenuItemVariant = 'primary' | 'secondary' | 'danger' | 'default';
export type MenuItemType = 'navigation' | 'action' | 'divider';

/**
 * Base menu item with common properties
 */
export interface BaseMenuItem {
  id: string;
  label: string;
  allowedRoles: UserRoleType[];
  type?: MenuItemType;
}

/**
 * Navigation menu item - renders as a link/route
 */
export interface NavigationMenuItem extends BaseMenuItem {
  type: 'navigation';
  icon: string;
  route: string;
  badge?: {
    count: number;
    color?: string;
  };
}

/**
 * Action menu item - triggers a callback function
 */
export interface ActionMenuItem extends BaseMenuItem {
  type: 'action';
  icon: string;
  action: string; // Function name to call
  variant?: MenuItemVariant;
  confirmRequired?: boolean;
  confirmMessage?: string;
}

/**
 * Divider menu item - visual separator
 */
export interface DividerMenuItem extends BaseMenuItem {
  type: 'divider';
}

export type MenuItem = NavigationMenuItem | ActionMenuItem | DividerMenuItem;

/**
 * Menu section/group configuration
 */
export interface MenuSection {
  id: string;
  title?: string;
  description?: string;
  items: MenuItem[];
  collapsible?: boolean;
}

/**
 * Dynamic menu template
 */
export interface DynamicMenuTemplate {
  menuId: string;
  menuTitle: string;
  description?: string;
  navigation: MenuItem[];
  sidebarExtras?: MenuItem[];
  avatar?: MenuItem[];
  modals?: {
    [key: string]: MenuSection;
  };
}

/**
 * Filtered menu for specific user role
 */
export interface FilteredMenu {
  menuId: string;
  menuTitle: string;
  description?: string;
  navigation: MenuItem[];
  sidebarExtras?: MenuItem[];
  avatar?: MenuItem[];
  availableActions: string[];
}

/**
 * Menu configuration options
 */
export interface MenuConfig {
  enableBadges?: boolean;
  enableIcons?: boolean;
  maxItemsPerSection?: number;
  collapsibleByDefault?: boolean;
}
