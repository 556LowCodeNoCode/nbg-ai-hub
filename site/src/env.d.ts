// Ambient type declarations for the site workspace.
//
// `virtual:starlight/components/*` modules are runtime-resolved by Starlight's
// Astro integration via Vite, but TypeScript's module resolver can't see them
// because Starlight's `virtual-internal.d.ts` is not exported from its
// package.json. SplashAwareHeader.astro imports five of these modules
// (Search, ThemeSelect, SocialIcons, SiteTitle, LanguageSelect), so
// without the declarations below `astro check` fails with ts(2307) for
// each import.
//
// Runtime resolution works either way — these `declare module` blocks only
// satisfy the type checker. The declarations mirror Starlight 0.39's own
// virtual-internal.d.ts; if a Starlight upgrade adds new virtual components
// or renames an existing one, this file needs to be kept in sync.

declare module 'virtual:starlight/components/Search' {
  const Search: typeof import('@astrojs/starlight/components/Search.astro').default;
  export default Search;
}
declare module 'virtual:starlight/components/ThemeSelect' {
  const ThemeSelect: typeof import('@astrojs/starlight/components/ThemeSelect.astro').default;
  export default ThemeSelect;
}
declare module 'virtual:starlight/components/SocialIcons' {
  const SocialIcons: typeof import('@astrojs/starlight/components/SocialIcons.astro').default;
  export default SocialIcons;
}
declare module 'virtual:starlight/components/SiteTitle' {
  const SiteTitle: typeof import('@astrojs/starlight/components/SiteTitle.astro').default;
  export default SiteTitle;
}
declare module 'virtual:starlight/components/LanguageSelect' {
  const LanguageSelect: typeof import('@astrojs/starlight/components/LanguageSelect.astro').default;
  export default LanguageSelect;
}
