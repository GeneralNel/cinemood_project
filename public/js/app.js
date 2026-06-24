import { trackingFlash, wireInternalLinkGlitch } from './fx.js';

wireInternalLinkGlitch();

if (performance.getEntriesByType('navigation')[0]?.type === 'navigate') {
  trackingFlash(180);
}
