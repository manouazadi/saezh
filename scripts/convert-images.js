
import webp from 'webp-converter';

// actually I can walk directories myself or use a simple recursive function.
import { readdirSync, statSync, existsSync } from 'fs';
import { join, extname, dirname, sep } from 'path'; // Add sep import
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const imagesDir = join(projectRoot, 'public/images');

// Grant permission for webp-converter (required for some versions/platforms)
webp.grant_permission();

function getAllFiles(dirPath, arrayOfFiles) {
    const files = readdirSync(dirPath);

    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function (file) {
        if (statSync(dirPath + "/" + file).isDirectory()) {
            arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
        } else {
            arrayOfFiles.push(join(dirPath, "/", file));
        }
    });

    return arrayOfFiles;
}

async function convertImages() {
    console.log('🔍 Scanning for images to convert...');
    const allFiles = getAllFiles(imagesDir, []);

    const imagesToConvert = allFiles.filter(file => {
        const ext = extname(file).toLowerCase();
        return ['.jpg', '.jpeg', '.png'].includes(ext);
    });

    if (imagesToConvert.length === 0) {
        console.log('✨ No images found to convert.');
        return;
    }

    console.log(`📸 Found ${imagesToConvert.length} images. Starting conversion...`);

    let convertedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const file of imagesToConvert) {
        const ext = extname(file);
        const outputFile = file.replace(ext, '.webp');

        // Skip if webp already exists and is newer? 
        // For now, let's just checking if it exists to avoid re-work if unnecessary, 
        // unless we want to force rebuild. 
        // Let's implement a simple check: if webp exists, skip.
        if (existsSync(outputFile)) {
            // Optional: check timestamps. For now, simple skip.
            // const srcStat = statSync(file);
            // const destStat = statSync(outputFile);
            // if (destStat.mtime > srcStat.mtime) {
            skippedCount++;
            // process.stdout.write('.');
            continue;
            // }
        }

        try {
            // cwebp(input_image, output_image, option)
            const result = await webp.cwebp(file, outputFile, "-q 80");
            if (result.includes("Error")) {
                console.error(`\n❌ Error converting ${file}: ${result}`);
                errorCount++;
            } else {
                convertedCount++;
                console.log(`✅ Converted: ${file.split(sep + 'public' + sep)[1] || file} -> .webp`);
            }
        } catch (e) {
            console.error(`\n❌ Exception converting ${file}:`, e);
            errorCount++;
        }
    }

    console.log('\n🎉 Conversion complete!');
    console.log(`   Processed: ${convertedCount}`);
    console.log(`   Skipped: ${skippedCount}`);
    console.log(`   Errors: ${errorCount}`);
}

convertImages();
