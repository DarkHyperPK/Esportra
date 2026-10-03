import { getFontEmbedCSS, toPng } from 'html-to-image';

/** A transparent pixel, used when a cross-origin image refuses to be captured. */
const BLANK = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

let fontCss: Promise<string> | null = null;

/** Wait until every image inside the node has loaded or failed (bounded). */
async function imagesSettled(node: HTMLElement, timeoutMs = 8000) {
    const pending = Array.from(node.querySelectorAll('img')).filter((img) => !img.complete);
    const settle = Promise.all(pending.map((img) => new Promise<void>((resolve) => {
        img.addEventListener('load', () => resolve(), { once: true });
        img.addEventListener('error', () => resolve(), { once: true });
    })));
    await Promise.race([settle, new Promise((resolve) => window.setTimeout(resolve, timeoutMs))]);
}

/**
 * Render a DOM node to PNG at its native size and download it.
 * Fonts are embedded once per session and reused for later exports.
 */
export async function downloadNodeAsPng(node: HTMLElement, fileName: string, size: { width: number; height: number }) {
    await document.fonts?.ready;
    await imagesSettled(node);
    fontCss ??= getFontEmbedCSS(node).catch(() => '');
    const dataUrl = await toPng(node, {
        width: size.width,
        height: size.height,
        pixelRatio: 1,
        cacheBust: true,
        imagePlaceholder: BLANK,
        fontEmbedCSS: await fontCss,
    });
    const link = document.createElement('a');
    link.download = fileName;
    link.href = dataUrl;
    link.click();
}
