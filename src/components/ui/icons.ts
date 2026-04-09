/**
 * Google Material Icons - Common Icon Names
 * 
 * Usage Examples:
 * 
 * import { Icon } from '@/components/ui/Icon';
 * 
 * // Basic usage (filled variant)
 * <Icon name="home" />
 * 
 * // With different variants
 * <Icon name="settings" variant="outlined" />
 * <Icon name="favorite" variant="two-tone" />
 * 
 * // With size
 * <Icon name="search" size="small" />      // small icon
 * <Icon name="menu" size="medium" />       // medium icon (default)
 * <Icon name="help_outline" size="large" /> // large icon
 * 
 * // With custom color
 * <Icon name="star" color="#FFD700" />
 * <Icon name="check_circle" color="green" />
 * 
 * // With custom className (e.g., Tailwind)
 * <Icon name="arrow_forward" className="hover:scale-110 transition-transform" />
 * 
 * // Combined
 * <Icon 
 *   name="download" 
 *   variant="outlined" 
 *   size="large" 
 *   color="blue"
 *   className="cursor-pointer hover:text-blue-700"
 * />
 */

// Common Icon Names for your project:
export const ICON_NAMES = {
  // Navigation
  menu: 'menu',
  close: 'close',
  arrowBack: 'arrow_back',
  arrowForward: 'arrow_forward',
  home: 'home',
  
  // User Actions
  search: 'search',
  settings: 'settings',
  logout: 'logout',
  login: 'login',
  person: 'person',
  account: 'account_circle',
  
  // Status
  checkCircle: 'check_circle',
  errorCircle: 'error',
  warning: 'warning',
  info: 'info',
  
  // Common Actions
  add: 'add',
  edit: 'edit',
  delete: 'delete',
  save: 'save',
  cancel: 'cancel',
  
  // Media
  image: 'image',
  video: 'videocam',
  file: 'description',
  download: 'download',
  upload: 'cloud_upload',
  
  // Other
  favorite: 'favorite',
  star: 'star',
  share: 'share',
  refresh: 'refresh',
  phone: 'phone',
  email: 'email',
  location: 'location_on',
  calendar: 'calendar_today',
  clock: 'schedule',
  bell: 'notifications',
  chat: 'chat',
  send: 'send',
  more: 'more_vert',
} as const;

// Find all available Material Icons at:
// https://fonts.google.com/icons
