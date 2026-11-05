import type { ImageMetadata } from 'astro';

// The resume picture is saved as src/assets/resume-page-<fingerprint>.png by tools/resume-image.sh.
// The fingerprint changes whenever the resume PDF does, so browsers never keep showing an old copy.
const found = import.meta.glob<{ default: ImageMetadata }>('../assets/resume-page-*.png', { eager: true });
const pages = Object.values(found);
if (pages.length !== 1) throw new Error(`Expected one src/assets/resume-page-*.png, found ${pages.length}. Run: sh tools/resume-image.sh`);

export default pages[0].default;
