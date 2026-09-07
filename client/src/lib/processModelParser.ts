import JSZip from 'jszip';

export interface ProcessModelParseResult {
    type: 'bpmn_xml' | 'image' | 'unsupported_bpm' | 'error';
    xml?: string;
    imageUrl?: string;
    reason?: 'bizagi_container' | 'binary_bpm' | 'text_not_xml' | 'empty_file' | 'generic';
    errorMessage?: string;
    fileNames?: string[];
}

/**
 * Robustly inspects and parses process model files (.bpmn, .bpmn2, .bpm, .xml):
 * - Checks for standard BPMN 2.0 XML
 * - Strips UTF-8 Byte Order Marks (BOM)
 * - Detects and unpacks ZIP containers (such as Bizagi Modeler .bpm files)
 * - Extracts embedded BPMN XML, XPDL, or preview diagrams (PNG/SVG) if present
 * - Accurately classifies proprietary project files for clear user guidance
 */
export async function parseProcessModelData(
    data: ArrayBuffer | Blob | string
): Promise<ProcessModelParseResult> {
    try {
        let buffer: ArrayBuffer;

        if (typeof data === 'string') {
            const clean = data.replace(/^\uFEFF/, '').trim();
            if (clean.startsWith('<')) {
                return { type: 'bpmn_xml', xml: clean };
            }
            return {
                type: 'unsupported_bpm',
                reason: 'text_not_xml',
                errorMessage: "Le contenu ne correspond pas à un format XML / BPMN valide."
            };
        } else if (data instanceof Blob) {
            buffer = await data.arrayBuffer();
        } else {
            buffer = data;
        }

        if (!buffer || buffer.byteLength === 0) {
            return {
                type: 'error',
                reason: 'empty_file',
                errorMessage: "Le fichier téléchargé est vide."
            };
        }

        const uint8 = new Uint8Array(buffer);
        // ZIP magic numbers: PK\x03\x04, PK\x05\x06, PK\x07\x08
        const isZip = uint8.length >= 4 && uint8[0] === 0x50 && uint8[1] === 0x4B && (uint8[2] === 0x03 || uint8[2] === 0x05 || uint8[2] === 0x07);

        if (isZip) {
            try {
                const zip = await JSZip.loadAsync(buffer);
                const fileNames = Object.keys(zip.files).filter(name => !zip.files[name].dir);

                // 1. Search for explicit .bpmn or .bpmn2 files
                const bpmnFile = fileNames.find(n => n.toLowerCase().endsWith('.bpmn') || n.toLowerCase().endsWith('.bpmn2'));
                if (bpmnFile) {
                    const text = await zip.file(bpmnFile)!.async('text');
                    const clean = text.replace(/^\uFEFF/, '').trim();
                    if (clean.startsWith('<')) {
                        return { type: 'bpmn_xml', xml: clean, fileNames };
                    }
                }

                // 2. Search for XML files containing BPMN definitions
                const xmlFiles = fileNames.filter(n => n.toLowerCase().endsWith('.xml') || n.toLowerCase().endsWith('.xpdl'));
                for (const xf of xmlFiles) {
                    try {
                        const text = await zip.file(xf)!.async('text');
                        const clean = text.replace(/^\uFEFF/, '').trim();
                        if (
                            clean.startsWith('<') &&
                            (clean.includes('<definitions') ||
                             clean.includes('<bpmn:definitions') ||
                             clean.includes('<bpmn2:definitions') ||
                             clean.includes('http://www.omg.org/spec/BPMN/'))
                        ) {
                            return { type: 'bpmn_xml', xml: clean, fileNames };
                        }
                    } catch (_) {}
                }

                // 3. Search for embedded image previews (PNG, SVG, JPG, WEBP)
                const imgFile = fileNames.find(n => {
                    const lower = n.toLowerCase();
                    return lower.endsWith('.png') || lower.endsWith('.svg') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.webp');
                });
                if (imgFile) {
                    const blob = await zip.file(imgFile)!.async('blob');
                    const imageUrl = URL.createObjectURL(blob);
                    return { type: 'image', imageUrl, fileNames };
                }

                // 4. Archive without standard BPMN 2.0 XML (typical Bizagi Modeler .bpm container)
                return {
                    type: 'unsupported_bpm',
                    reason: 'bizagi_container',
                    fileNames
                };
            } catch (zipErr: any) {
                console.warn("Could not read as ZIP archive:", zipErr);
            }
        }

        // Not a zip or failed zip load: decode as UTF-8
        const text = new TextDecoder('utf-8', { fatal: false }).decode(buffer).replace(/^\uFEFF/, '').trim();
        if (text.startsWith('<')) {
            return { type: 'bpmn_xml', xml: text };
        }

        // Binary non-zip format
        return {
            type: 'unsupported_bpm',
            reason: 'binary_bpm'
        };
    } catch (err: any) {
        return {
            type: 'error',
            reason: 'generic',
            errorMessage: err.message || "Erreur lors de l'analyse du fichier."
        };
    }
}
