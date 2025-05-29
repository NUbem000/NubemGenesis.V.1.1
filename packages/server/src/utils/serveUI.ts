import path from 'path'
import fs from 'fs'

/**
 * Get the UI build path for serving static files
 * Tries multiple locations to find the built UI files
 */
export const getUIBuildPath = (): string => {
    const checkPaths = [
        // Direct path to nubemgenesis-ui build
        path.join(__dirname, '..', '..', '..', 'ui', 'build'),
        path.join(__dirname, '..', '..', '..', 'ui', 'dist'),
        
        // From node_modules using workspace name
        path.join(__dirname, '..', '..', 'node_modules', 'nubemgenesis-ui', 'build'),
        path.join(__dirname, '..', '..', 'node_modules', 'nubemgenesis-ui', 'dist'),
        
        // From root node_modules
        path.join(__dirname, '..', '..', '..', '..', 'node_modules', 'nubemgenesis-ui', 'build'),
        path.join(__dirname, '..', '..', '..', '..', 'node_modules', 'nubemgenesis-ui', 'dist'),
        
        // Direct workspace reference
        path.join(__dirname, '..', '..', '..', 'packages', 'ui', 'build'),
        path.join(__dirname, '..', '..', '..', 'packages', 'ui', 'dist'),
        
        // Fallback to flowise-ui for compatibility
        path.join(__dirname, '..', '..', 'node_modules', 'flowise-ui', 'dist'),
        path.join(__dirname, '..', '..', '..', '..', 'node_modules', 'flowise-ui', 'dist')
    ]
    
    for (const checkPath of checkPaths) {
        if (fs.existsSync(checkPath)) {
            console.log(`[server]: Found UI build at ${checkPath}`)
            return checkPath
        }
    }
    
    // If no build found, return the most likely path and let it fail later
    console.warn('[server]: UI build not found in any expected location')
    return path.join(__dirname, '..', '..', '..', 'ui', 'build')
}