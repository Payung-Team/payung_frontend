import { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Icon } from '../ui/Icon';

export interface NavItem {
  path: string;
  label: string;
  icon: string;
}

interface MobileNavigationProps {
  navItems: NavItem[];
}

export default function MobileNavigation({ navItems }: MobileNavigationProps) {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;
  const navRef = useRef<HTMLElement>(null);

  // เผยความสูงจริงของแถบเมนูล่างเป็น --mobile-nav-h (label อาจขึ้นสองบรรทัด, จอ md+ ซ่อน = 0)
  // ให้แถบปุ่มที่ fixed ด้านล่างของหน้าอื่น (เช่น ปุ่มถัดไปของการจอง) วางเหนือเมนูได้
  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const root = document.documentElement;
    const update = () => root.style.setProperty('--mobile-nav-h', `${el.offsetHeight}px`);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
      root.style.removeProperty('--mobile-nav-h');
    };
  }, []);

  return (
    <nav ref={navRef} className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white border-t border-gray-200">
      <div className="flex items-center justify-around">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center justify-center flex-1 py-3 px-2 text-center rounded-full transition-colors ${
              isActive(item.path)
                ? 'text-[#52B69A]'
                : 'text-gray-600'
            }`}
          >
            <Icon name={item.icon} size="large" className="mb-1" />
            <span className={`text-xs px-3 py-1 rounded-full transition-all ${
              isActive(item.path)
                ? 'bg-[#F0FAF4] text-[#52B69A] font-semibold'
                : ''
            }`}>
              {item.label}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
