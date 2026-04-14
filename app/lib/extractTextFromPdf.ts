/**
 * extractTextFromPdf.ts
 *
 * Uses pdfjs-dist (already installed) to extract all text content
 * from a PDF Blob.  Returns plain text with newlines between lines.
 */

let pdfjsLib: any = null;
let loadPromise: Promise<any> | null = null;

async function loadPdfJs(): Promise<any> {
    if (pdfjsLib) return pdfjsLib;
    if (loadPromise) return loadPromise;

    // @ts-expect-error - pdfjs-dist/build/pdf.mjs is not a module
    loadPromise = import("pdfjs-dist/build/pdf.mjs").then((lib) => {
        lib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        pdfjsLib = lib;
        return lib;
    });

    return loadPromise;
}

export async function extractTextFromPdf(blob: Blob): Promise<string> {
    const lib = await loadPdfJs();
    const arrayBuffer = await blob.arrayBuffer();
    const pdf = await lib.getDocument({ data: arrayBuffer }).promise;

    const textParts: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();

        let lastY: number | null = null;
        const lineBuffer: string[] = [];

        for (const item of textContent.items) {
            if (!item.str) continue;

            // When the Y position changes significantly, it's a new line
            const y = Math.round(item.transform[5]);
            if (lastY !== null && Math.abs(y - lastY) > 2) {
                textParts.push(lineBuffer.join(''));
                lineBuffer.length = 0;
            }
            lineBuffer.push(item.str);
            lastY = y;
        }

        // Flush remaining line
        if (lineBuffer.length > 0) {
            textParts.push(lineBuffer.join(''));
        }

        // Page separator
        if (i < pdf.numPages) {
            textParts.push('');
        }
    }

    return textParts.join('\n');
}
