import { useEffect, useMemo, useState } from 'react';
import { Breadcrumb, Button, Divider, Drawer, Grid, Layout, Menu, Space, Tooltip, Typography, type MenuProps } from 'antd';
import { LayoutDashboard, Menu as MenuIcon, Moon, Search, Sun } from 'lucide-react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { appConfig } from '../config/app.config';
import {
  getBreadcrumbTrail,
  getCommandItems,
  getNavigation,
  getNavigationRoute,
  matchRoute,
} from '../config/routes';
import { useAppPreferences } from '../app/AppProviders';
import { CommandPalette, type CommandItem } from '../components/CommandPalette/CommandPalette';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useIsMac } from '../hooks/useIsMac';
import { copy } from '../config/copy';
import styles from './AppLayout.module.css';

export default function AppLayout() {
  const screens = Grid.useBreakpoint();
  const isMobile = screens.lg === false;
  const location = useLocation();
  const navigate = useNavigate();
  const { themeMode, toggleTheme } = useAppPreferences();
  const isMac = useIsMac();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const navigation = useMemo(() => getNavigation(), []);
  const commandItems = useMemo(() => getCommandItems(), []);
  const currentRoute = matchRoute(location.pathname);
  const activeNav = getNavigationRoute(location.pathname);
  const breadcrumbs = getBreadcrumbTrail(location.pathname);
  const shortcutLabel = isMac ? '⌘ K' : 'Ctrl K';
  const themeLabel = themeMode === 'dark' ? copy.nav.lightTheme : copy.nav.darkTheme;

  useDocumentTitle(currentRoute?.title ?? copy.errors.title404);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onGlobalKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onGlobalKeyDown);
    return () => window.removeEventListener('keydown', onGlobalKeyDown);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [location.pathname]);

  const navigateTo = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
    setSearchOpen(false);
  };

  const handleCommandSelect = (item: CommandItem) => navigateTo(item.path);

  const menuItems: MenuProps['items'] = [
    ...(navigation.dashboard
      ? [
          {
            key: navigation.dashboard.path,
            label: navigation.dashboard.label,
            icon: <LayoutDashboard size={16} aria-hidden="true" />,
          },
        ]
      : []),
    ...navigation.groups.map((group) => {
      const GroupIcon = group.icon;
      return {
        key: group.key,
        label: group.label,
        icon: <GroupIcon size={16} aria-hidden="true" />,
        children: group.items.map((route) => {
          const Icon = route.icon;
          return {
            key: route.path,
            label: route.label,
            ...(Icon ? { icon: <Icon size={16} aria-hidden="true" /> } : {}),
          };
        }),
      };
    }),
  ];

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key.startsWith('/')) navigateTo(key);
  };

  const menu = (mode: 'horizontal' | 'inline') => (
    <Menu
      mode={mode}
      selectedKeys={activeNav ? [activeNav.path] : []}
      defaultOpenKeys={activeNav?.group ? [activeNav.group] : []}
      items={menuItems}
      onClick={handleMenuClick}
      className={mode === 'horizontal' ? styles.desktopMenu : styles.mobileMenu}
      aria-label={copy.nav.main}
    />
  );

  const drawerExtras = (
    <div className={styles.drawerExtras}>
      <Button
        block
        icon={<Search size={16} />}
        onClick={() => {
          setMobileMenuOpen(false);
          setSearchOpen(true);
        }}
      >
        {copy.command.title}
        <kbd className={styles.drawerShortcut}>{shortcutLabel}</kbd>
      </Button>
      <Button block icon={themeMode === 'dark' ? <Sun size={16} /> : <Moon size={16} />} onClick={toggleTheme}>
        {themeLabel}
      </Button>
    </div>
  );

  return (
    <Layout className={styles.shell}>
      <a href="#main-content" className={styles.skipLink}>
        {copy.nav.skipToContent}
      </a>
      <header className={styles.header}>
        <div className={styles.brand}>
          {isMobile && (
            <Button
              type="text"
              aria-label={copy.nav.openMenu}
              icon={<MenuIcon size={20} />}
              onClick={() => setMobileMenuOpen(true)}
            />
          )}
          <Link to="/" className={styles.brandLink} aria-label={copy.nav.brandHome(appConfig.name)}>
            <span className={styles.brandMark} aria-hidden="true">
              {appConfig.logoText}
            </span>
            <Typography.Text strong className={styles.brandName}>
              {appConfig.name}
            </Typography.Text>
          </Link>
        </div>

        <nav className={styles.desktopNav} aria-label={copy.nav.main}>
          {!isMobile && menu('horizontal')}
        </nav>

        <Space className={styles.tools} size={6}>
          <Tooltip title={copy.nav.searchTooltip(shortcutLabel)}>
            <Button
              type="default"
              icon={<Search size={16} />}
              onClick={() => setSearchOpen(true)}
              aria-label={copy.nav.openSearch}
            >
              <span className={styles.searchLabel}>{copy.nav.search}</span>
              <kbd className={styles.shortcut}>{shortcutLabel}</kbd>
            </Button>
          </Tooltip>
          <Tooltip title={themeLabel}>
            <Button
              type="text"
              aria-label={themeLabel}
              icon={themeMode === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              onClick={toggleTheme}
            />
          </Tooltip>
        </Space>
      </header>

      <main id="main-content" className={styles.content} tabIndex={-1}>
        {breadcrumbs.length > 1 && (
          <Breadcrumb
            className={styles.breadcrumb}
            aria-label={copy.nav.breadcrumb}
            items={breadcrumbs.map((entry) => ({
              key: entry.key,
              title: entry.path ? <Link to={entry.path}>{entry.title}</Link> : entry.title,
            }))}
          />
        )}
        <Outlet />
      </main>

      <footer className={styles.footer}>{appConfig.footerText}</footer>

      <Drawer
        title={
          <div className={styles.drawerTitle}>
            <span className={styles.brandMark} aria-hidden="true">
              {appConfig.logoText}
            </span>
            <div>
              <Typography.Text strong>{appConfig.name}</Typography.Text>
              <Typography.Text type="secondary" className={styles.drawerCaption}>
                {appConfig.sidebarCaption}
              </Typography.Text>
            </div>
          </div>
        }
        placement="left"
        open={isMobile && mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        size={300}
        styles={{ body: { padding: '12px 8px' }, wrapper: { maxWidth: '100vw' } }}
      >
        {drawerExtras}
        <Divider className={styles.drawerDivider} />
        {menu('inline')}
      </Drawer>

      <CommandPalette
        open={searchOpen}
        items={commandItems}
        onClose={() => setSearchOpen(false)}
        onSelect={handleCommandSelect}
      />
    </Layout>
  );
}
