#!/usr/bin/env node
/**
 * Generates a JSON manifest of all photos in /public/images/photos/
 * Run this script when adding new photos, or include it in the build process.
 * 
 * Usage: node scripts/generate-photos.js
 */

import { readdirSync, writeFileSync, statSync } from 'fs'
import { join, extname } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..')

const PHOTOS_DIR = join(projectRoot, 'public/images/photos')
const OUTPUT_FILE = join(projectRoot, 'public/data/photos.json')
const VALID_EXTENSIONS = ['.webp', '.jpg', '.jpeg', '.png', '.gif', '.avif']

// Exclusion list - filenames to exclude (used for film thumbnails, etc.)
const EXCLUDE_FILES = [
  'moin.webp',
  'lock.webp', 
  'bluekite.webp',
  'monsieur.webp'
]

function generatePhotoManifest() {
  try {
    const files = readdirSync(PHOTOS_DIR)
    
    const photos = files
      .filter(file => {
        const ext = extname(file).toLowerCase()
        return VALID_EXTENSIONS.includes(ext) && !EXCLUDE_FILES.includes(file)
      })
      .map(file => {
        const filePath = join(PHOTOS_DIR, file)
        const stats = statSync(filePath)
        
        // Generate alt text from filename
        const nameWithoutExt = file.replace(/\.[^.]+$/, '')
        const altText = nameWithoutExt
          .replace(/[-_^]/g, ' ')
          .replace(/([a-z])([A-Z])/g, '$1 $2')
          .replace(/\s+/g, ' ')
          .trim()
        
        return {
          src: `/public/images/photos/${file}`,
          alt: altText,
          filename: file,
          modified: stats.mtime.toISOString()
        }
      })
      // Sort by modified date (newest first)
      .sort((a, b) => new Date(b.modified) - new Date(a.modified))
    
    const manifest = {
      generated: new Date().toISOString(),
      count: photos.length,
      photos
    }
    
    writeFileSync(OUTPUT_FILE, JSON.stringify(manifest, null, 2))
    console.log(`✓ Generated ${OUTPUT_FILE} with ${photos.length} photos`)
    
  } catch (error) {
    console.error('Error generating photo manifest:', error)
    process.exit(1)
  }
}

generatePhotoManifest()

