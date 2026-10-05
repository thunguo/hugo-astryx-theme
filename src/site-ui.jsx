import { TopNav, TopNavHeading, TopNavItem } from '@astryxdesign/core/TopNav';
import { Button } from '@astryxdesign/core/Button';
import { HStack, VStack } from '@astryxdesign/core/Layout';
import { Popover } from '@astryxdesign/core/Popover';
import { Divider } from '@astryxdesign/core/Divider';
import { BrandMark } from './brand.jsx';
import { siteIcons as icons } from './icons.mjs';

export function SiteHeader({config, mode = 'system', onSearch, onMode, menuOpen, onMenuChange}) {
  const en = config.uiLocale?.startsWith('en');
  return <TopNav label={en ? 'Main navigation' : '主导航'} lang={config.uiLocale}
    heading={<TopNavHeading logo={<BrandMark src={config.logoURL}/>} heading={config.siteTitle} headingHref={config.homeURL} />}
    centerContent={<div className="site-nav-desktop">{config.navigation.map(item =>
      <TopNavItem key={item.href} label={item.label} href={item.href} isSelected={item.selected} />)}</div>}
    endContent={<HStack gap={2} className="site-nav-actions">
      <HStack gap={0.5}>
        <Button label={en ? 'Search' : '搜索'} variant="ghost" isIconOnly icon={icons.search}
          href={onSearch ? undefined : config.searchURL} onClick={onSearch} aria-haspopup={onSearch ? 'dialog' : undefined}
          aria-keyshortcuts={onSearch ? 'Control+k Meta+k' : undefined}/>
        {onMode && <Button label={en ? 'Appearance' : '外观'} variant="ghost" isIconOnly
          icon={mode === 'dark' ? icons.sun : icons.moon} onClick={onMode} aria-pressed={mode === 'dark'}
          tooltip={en ? `Use ${mode === 'dark' ? 'light' : 'dark'} appearance` : `切换至${mode === 'dark' ? '浅' : '深'}色模式`}/>}
      </HStack>
      {config.rssURL && <span className="site-rss-link"><Button label="RSS" href={config.rssURL} variant="secondary" /></span>}
      {onMenuChange && <span className="site-mobile-toggle">
        <Popover label={en ? 'Navigation' : '导航菜单'} className="site-menu-popover"
          placement="below" alignment="end" width="min(288px, calc(100vw - 32px))" padding={2}
          isOpen={menuOpen} onOpenChange={onMenuChange} closeButtonLabel={en ? 'Close menu' : '关闭菜单'}
          content={<VStack gap={2} lang={config.uiLocale}>
            <nav aria-label={en ? 'Pages' : '页面导航'}>
              <VStack gap={1}>
                {config.navigation.map(item => <Button key={item.href} label={item.label} href={item.href}
                  variant={item.selected ? 'secondary' : 'ghost'} width="100%" className="site-menu-link"
                  aria-current={item.selected ? 'page' : undefined} onClick={() => onMenuChange(false)}/>)}
              </VStack>
            </nav>
            {config.rssURL && <><Divider/><Button label={en ? 'Subscribe via RSS' : '订阅 RSS'} href={config.rssURL}
              variant="ghost" width="100%" className="site-menu-link site-menu-rss"/></>}
          </VStack>}>
          <Button label={en ? 'Open menu' : '打开菜单'} variant="ghost" isIconOnly icon={menuOpen ? icons.close : icons.menu}/>
        </Popover>
      </span>}
    </HStack>} />;
}
