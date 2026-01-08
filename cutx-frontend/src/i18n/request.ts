import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  // This typically corresponds to the `[locale]` segment
  let locale = await requestLocale;

  // Ensure that a valid locale is used
  if (!locale || !routing.locales.includes(locale as 'fr' | 'en')) {
    locale = routing.defaultLocale;
  }

  // Load all namespace files
  const [common, configurateur, dialogs, products, home] = await Promise.all([
    import(`../messages/${locale}/common.json`),
    import(`../messages/${locale}/configurateur.json`),
    import(`../messages/${locale}/dialogs.json`),
    import(`../messages/${locale}/products.json`),
    import(`../messages/${locale}/home.json`),
  ]);

  return {
    locale,
    messages: {
      common: common.default,
      configurateur: configurateur.default,
      dialogs: dialogs.default,
      products: products.default,
      home: home.default,
    }
  };
});
