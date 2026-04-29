/**
 * Hook for working with dynamic menu templates
 */

import { useMemo } from 'react';
import type { DynamicMenuTemplate, FilteredMenu } from '../types/menu';
import { convertNumericRole, filterMenuTemplate } from '../lib/menuUtils';

interface UseMenuTemplateProps {
  template: DynamicMenuTemplate;
  userRole: number | null;
}

interface UseMenuTemplateReturn {
  filteredMenu: FilteredMenu | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook to filter menu template based on user role
 * Automatically converts numeric role to string role and filters items
 */
export function useMenuTemplate({
  template,
  userRole,
}: UseMenuTemplateProps): UseMenuTemplateReturn {
  return useMemo(() => {
    if (userRole === null) {
      return {
        filteredMenu: null,
        isLoading: false,
        error: 'User role not set',
      };
    }

    try {
      const stringRole = convertNumericRole(userRole);
      if (!stringRole) {
        return {
          filteredMenu: null,
          isLoading: false,
          error: `Invalid role: ${userRole}`,
        };
      }

      const filtered = filterMenuTemplate(template, stringRole);
      return {
        filteredMenu: filtered,
        isLoading: false,
        error: null,
      };
    } catch (err) {
      return {
        filteredMenu: null,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }, [template, userRole]);
}
