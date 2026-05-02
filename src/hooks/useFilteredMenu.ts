/**
 * Hook to load and filter menu based on user role
 * Automatically converts menu items to NavItems for Navigation component
 */

import { useEffect, useState } from 'react';
import { loadMenuTemplate } from '../lib/menuLoader';
import { filterMenuTemplate } from '../lib/menuUtils';
import { menuItemsToNavItems } from '../lib/menuAdapter';
import { convertNumericRole } from '../lib/menuUtils';
import type { DynamicMenuTemplate, FilteredMenu } from '../types/menu';
import type { NavItem } from '../lib/menuAdapter';

interface UseFilteredMenuReturn {
  navItems: NavItem[];
  filteredMenu: FilteredMenu | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook to manage dynamic menu loading and filtering
 * @param menuName - Name of the menu to load (e.g., 'mainMenu')
 * @param userRole - Numeric user role (1=patient, 2=caregiver, 3=admin)
 * @returns Object containing filtered menu, nav items, loading state, and errors
 */
export function useFilteredMenu(
  menuName: 'mainMenu' | 'profileMenu' | 'adminMenu',
  userRole: number | null
): UseFilteredMenuReturn {
  const [template, setTemplate] = useState<DynamicMenuTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load menu template on mount
  useEffect(() => {
    const loadMenu = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const menuTemplate = await loadMenuTemplate(menuName);
        setTemplate(menuTemplate);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load menu';
        setError(errorMessage);
        console.error('Menu loading error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadMenu();
  }, [menuName]);

  // Filter menu when template or userRole changes
  let filteredMenu: FilteredMenu | null = null;
  let navItems: NavItem[] = [];

  if (!isLoading && template && userRole !== null) {
    try {
      const stringRole = convertNumericRole(userRole);
      if (stringRole) {
        filteredMenu = filterMenuTemplate(template, stringRole);
        navItems = menuItemsToNavItems(filteredMenu.navigation);
      } else {
        setError(`Invalid user role: ${userRole}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to filter menu';
      setError(errorMessage);
    }
  }

  return {
    navItems,
    filteredMenu,
    isLoading,
    error,
  };
}
