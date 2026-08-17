'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const META_START = '<!-- TRIP_META_START -->';
const META_END = '<!-- TRIP_META_END -->';
const RESERVED_TRIP_IDS = new Set(['__proto__', 'constructor', 'prototype']);

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function compactDescription(value, fallback) {
    const compact = String(value || fallback).replace(/\s+/g, ' ').trim();
    const characters = Array.from(compact);
    if (characters.length <= 160) return compact;

    const shortened = characters.slice(0, 157).join('');
    const lastSpace = shortened.lastIndexOf(' ');
    return `${lastSpace >= 120 ? shortened.slice(0, lastSpace) : shortened}...`;
}

function validateTripId(value) {
    const tripId = String(value);
    if (!/^[a-z0-9][a-z0-9_-]*$/.test(tripId)) {
        throw new Error(
            `Unsafe trip ID "${tripId}". Use lowercase letters, numbers, hyphens or underscores.`,
        );
    }
    if (RESERVED_TRIP_IDS.has(tripId)) {
        throw new Error(`Reserved trip ID "${tripId}" cannot be published.`);
    }
    return tripId;
}

function validateTripImage(projectRoot, tripId, value) {
    if (typeof value !== 'string' || value.length === 0) {
        throw new Error(`Trip "${tripId}" must have a local image path.`);
    }
    if (value !== value.trim() || value.includes('\\') || value.includes('\0')) {
        throw new Error(`Trip "${tripId}" has an unsafe image path: ${value}`);
    }
    if (!/^images\/[a-z0-9][a-z0-9._/-]*\.(?:avif|gif|jpe?g|png|webp)$/i.test(value)) {
        throw new Error(`Trip "${tripId}" has an unsupported image path: ${value}`);
    }

    const normalized = path.posix.normalize(value);
    if (normalized !== value || !normalized.startsWith('images/')) {
        throw new Error(`Trip "${tripId}" image must stay inside images/: ${value}`);
    }

    const imagesRoot = path.resolve(projectRoot, 'images');
    const absolutePath = path.resolve(projectRoot, ...normalized.split('/'));
    if (!absolutePath.startsWith(`${imagesRoot}${path.sep}`)) {
        throw new Error(`Trip "${tripId}" image escapes images/: ${value}`);
    }

    let stat;
    try {
        stat = fs.lstatSync(absolutePath);
    } catch (_) {
        throw new Error(`Trip "${tripId}" image does not exist: ${value}`);
    }
    if (!stat.isFile() || stat.isSymbolicLink()) {
        throw new Error(`Trip "${tripId}" image must be a regular file: ${value}`);
    }

    const realImagesRoot = fs.realpathSync(imagesRoot);
    const realImagePath = fs.realpathSync(absolutePath);
    if (!realImagePath.startsWith(`${realImagesRoot}${path.sep}`)) {
        throw new Error(`Trip "${tripId}" image resolves outside images/: ${value}`);
    }

    return normalized;
}

function readSiteOrigin(projectRoot) {
    const hostname = fs.readFileSync(path.join(projectRoot, 'CNAME'), 'utf8').trim().toLowerCase();
    const url = new URL(`https://${hostname}`);
    if (url.hostname !== hostname || url.origin !== `https://${hostname}`) {
        throw new Error(`CNAME does not contain a safe hostname: ${hostname}`);
    }
    return url.origin;
}

function readTripsData(projectRoot) {
    const source = fs.readFileSync(path.join(projectRoot, 'js', 'trips-data.js'), 'utf8');
    const context = vm.createContext(Object.create(null));
    vm.runInContext(
        `${source}\n;globalThis.__generatedTripsData = tripsData;`,
        context,
        { filename: 'js/trips-data.js', timeout: 2000 },
    );
    const trips = context.__generatedTripsData;
    if (!trips || typeof trips !== 'object' || Array.isArray(trips)) {
        throw new Error('js/trips-data.js did not define a tripsData object.');
    }
    return trips;
}

function replaceExactlyOnce(source, target, replacement, label) {
    const first = source.indexOf(target);
    if (first < 0 || source.indexOf(target, first + target.length) >= 0) {
        throw new Error(`trip-detail.html must contain exactly one ${label}.`);
    }
    return source.slice(0, first) + replacement + source.slice(first + target.length);
}

function replaceMetadataBlock(source, replacement) {
    const start = source.indexOf(META_START);
    const end = source.indexOf(META_END, start + META_START.length);
    if (
        start < 0 ||
        end < 0 ||
        source.indexOf(META_START, start + META_START.length) >= 0 ||
        source.indexOf(META_END, end + META_END.length) >= 0
    ) {
        throw new Error('trip-detail.html must contain one complete trip metadata block.');
    }
    return source.slice(0, start) + replacement + source.slice(end + META_END.length);
}

function buildMetadata({ tripId, trip, imagePath, siteOrigin }) {
    if (typeof trip.title !== 'string' || trip.title.trim().length === 0) {
        throw new Error(`Trip "${tripId}" must have a title.`);
    }

    const title = `${trip.title.trim()} - Team Weekend Trekkers`;
    const description = compactDescription(
        trip.about,
        `Explore ${trip.title.trim()} with Team Weekend Trekkers.`,
    );
    const pageUrl = `${siteOrigin}/trips/${encodeURIComponent(tripId)}/`;
    const imageUrl = new URL(`/${imagePath}`, siteOrigin).href;

    return [
        META_START,
        `<title>${escapeHtml(title)}</title>`,
        `<meta name="description" content="${escapeHtml(description)}">`,
        `<link rel="canonical" href="${escapeHtml(pageUrl)}">`,
        '<meta property="og:type" content="website">',
        '<meta property="og:site_name" content="Team Weekend Trekkers">',
        `<meta property="og:title" content="${escapeHtml(title)}">`,
        `<meta property="og:description" content="${escapeHtml(description)}">`,
        `<meta property="og:url" content="${escapeHtml(pageUrl)}">`,
        `<meta property="og:image" content="${escapeHtml(imageUrl)}">`,
        '<meta name="twitter:card" content="summary_large_image">',
        `<meta name="twitter:title" content="${escapeHtml(title)}">`,
        `<meta name="twitter:description" content="${escapeHtml(description)}">`,
        `<meta name="twitter:image" content="${escapeHtml(imageUrl)}">`,
        META_END,
    ].join('\n    ');
}

function renderTripPage({ template, tripId, trip, projectRoot, siteOrigin }) {
    const safeTripId = validateTripId(tripId);
    const imagePath = validateTripImage(projectRoot, safeTripId, trip.image);
    const metadata = buildMetadata({
        tripId: safeTripId,
        trip,
        imagePath,
        siteOrigin,
    });

    let page = replaceExactlyOnce(
        template,
        'data-trip-id=""',
        `data-trip-id="${escapeHtml(safeTripId)}"`,
        'empty data-trip-id attribute',
    );
    page = replaceExactlyOnce(
        page,
        '<!-- TRIP_BASE -->',
        '<base href="../../">',
        'TRIP_BASE marker',
    );
    return replaceMetadataBlock(page, metadata);
}

function ensureEmptyOutputDirectory(outputDir) {
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
        return;
    }

    const stat = fs.lstatSync(outputDir);
    if (!stat.isDirectory() || stat.isSymbolicLink()) {
        throw new Error(`Trip-page output must be a regular directory: ${outputDir}`);
    }
    if (fs.readdirSync(outputDir).length > 0) {
        throw new Error(`Trip-page output must be empty to prevent stale pages: ${outputDir}`);
    }
}

function generateTripPages({ projectRoot, outputDir }) {
    const resolvedProjectRoot = path.resolve(projectRoot);
    const resolvedOutputDir = path.resolve(outputDir);
    const template = fs.readFileSync(path.join(resolvedProjectRoot, 'trip-detail.html'), 'utf8');
    const trips = readTripsData(resolvedProjectRoot);
    const siteOrigin = readSiteOrigin(resolvedProjectRoot);
    const entries = Object.entries(trips);

    ensureEmptyOutputDirectory(resolvedOutputDir);

    const generated = [];
    for (const [tripId, trip] of entries) {
        const safeTripId = validateTripId(tripId);
        const page = renderTripPage({
            template,
            tripId: safeTripId,
            trip,
            projectRoot: resolvedProjectRoot,
            siteOrigin,
        });
        const tripDirectory = path.join(resolvedOutputDir, safeTripId);
        fs.mkdirSync(tripDirectory);
        const outputPath = path.join(tripDirectory, 'index.html');
        fs.writeFileSync(outputPath, page, { encoding: 'utf8', flag: 'wx' });
        generated.push(outputPath);
    }

    return generated;
}

function parseOutputArgument(argv, projectRoot) {
    if (argv.length === 0) return path.join(projectRoot, 'trips');
    if (argv.length !== 2 || argv[0] !== '--output' || !argv[1]) {
        throw new Error('Usage: node scripts/generate-trip-pages.js [--output <empty-directory>]');
    }
    return path.resolve(process.cwd(), argv[1]);
}

if (require.main === module) {
    const projectRoot = path.resolve(__dirname, '..');
    const outputDir = parseOutputArgument(process.argv.slice(2), projectRoot);
    const generated = generateTripPages({ projectRoot, outputDir });
    process.stdout.write(`Generated ${generated.length} trip pages in ${outputDir}\n`);
}

module.exports = {
    buildMetadata,
    escapeHtml,
    generateTripPages,
    readSiteOrigin,
    readTripsData,
    renderTripPage,
    validateTripId,
    validateTripImage,
};
