import path from 'path';

/**
 * Sanitize a filename or file key to prevent Path Traversal attacks.
 * Strips directory traversal sequences (../, ..\) and ensures the result
 * is a safe basename or relative path within the allowed directory.
 */
export function sanitizeFilename(filename: string): string {
    // Get only the basename (removes any directory components like ../../)
    const basename = path.basename(filename);
    // Remove null bytes which can be used for path manipulation
    return basename.replace(/\0/g, '');
}

/**
 * Sanitize a storage key (which may contain subdirectories like "profiles/abc/photo.jpg").
 * Ensures no directory traversal can escape the base directory.
 */
export function sanitizeKey(key: string): string {
    // Normalize the path to resolve any .. sequences
    const normalized = path.normalize(key);
    // Remove any leading .. or absolute path components
    const cleaned = normalized
        .replace(/\0/g, '')           // Remove null bytes
        .replace(/^(\.\.[/\\])+/, '') // Remove leading ../
        .replace(/^[/\\]+/, '');      // Remove leading slashes (prevent absolute paths)

    // Final safety: ensure the path doesn't start with .. after normalization
    if (cleaned.startsWith('..')) {
        throw new Error('Invalid file key: path traversal detected');
    }

    return cleaned;
}

/**
 * Validate that a resolved file path is within the expected base directory.
 * This is the most robust defense against path traversal.
 */
export function isPathWithinBase(filePath: string, baseDir: string): boolean {
    const resolvedPath = path.resolve(filePath);
    const resolvedBase = path.resolve(baseDir);
    return resolvedPath.startsWith(resolvedBase + path.sep) || resolvedPath === resolvedBase;
}
