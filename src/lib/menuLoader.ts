/**
 * Menu loader - loads and caches menu templates
 */

import type { DynamicMenuTemplate } from '../types/menu';

type MenuTemplates = 'mainMenu' | 'profileMenu' | 'adminMenu' | 'patientMenu' | 'caregiverMenu';

const menuCache = new Map<string, DynamicMenuTemplate>();

/**
 * Load a menu template from JSON
 */
export async function loadMenuTemplate(
  menuName: MenuTemplates
): Promise<DynamicMenuTemplate> {
  // Check cache first
  if (menuCache.has(menuName)) {
    return menuCache.get(menuName)!;
  }

  try {
    // Dynamically import the menu JSON
    const menuModule = await import(`../data/menus/${menuName}.json`);
    const template: DynamicMenuTemplate = menuModule.default;

    // Cache for future use
    menuCache.set(menuName, template);

    return template;
  } catch (error) {
    console.error(`Failed to load menu template: ${menuName}`, error);
    throw new Error(`Menu template "${menuName}" not found`);
  }
}

/**
 * Load multiple menu templates at once
 */
export async function loadMenuTemplates(
  menuNames: MenuTemplates[]
): Promise<Map<string, DynamicMenuTemplate>> {
  const templates = new Map<string, DynamicMenuTemplate>();

  const results = await Promise.allSettled(
    menuNames.map((name) => loadMenuTemplate(name))
  );

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      templates.set(menuNames[index], result.value);
    } else {
      console.warn(`Failed to load menu: ${menuNames[index]}`, result.reason);
    }
  });

  return templates;
}

/**
 * Clear menu cache
 */
export function clearMenuCache(): void {
  menuCache.clear();
}

/**
 * Get all cached menus
 */
export function getCachedMenus(): Map<string, DynamicMenuTemplate> {
  return new Map(menuCache);
}
