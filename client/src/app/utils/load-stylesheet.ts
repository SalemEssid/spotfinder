const pending = new Map<string, Promise<void>>();

/**
 * Adds `<link rel="stylesheet" href>` to the page once and resolves when it has loaded.
 * Used to download the map styles (Leaflet + pins, built as `map.css`) only on pages that show a map.
 */
export function loadStylesheet(href: string): Promise<void> {
  let promise = pending.get(href);
  if (!promise) {
    promise = new Promise<void>((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.onload = () => resolve();
      link.onerror = () => reject(new Error(`Could not load ${href}`));
      document.head.append(link);
    });
    pending.set(href, promise);
  }
  return promise;
}
