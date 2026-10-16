// Offline itinerary brochures. Canvas preserves the browser's Unicode/emoji fonts.
(function (root, factory) {
    const api = factory(typeof module === 'object' && module.exports ? require('./trip-date-utils') : root.TripDateUtils,
        typeof module === 'object' && module.exports ? require('./trip-detail-lists') : root.TripDetailLists,
        typeof module === 'object' && module.exports ? require('./trip-content') : root.TripContent);
    if (typeof module === 'object' && module.exports) module.exports = api;
    else { root.TripBrochure = api; document.addEventListener('DOMContentLoaded', () => api.init(document)); }
}(typeof globalThis !== 'undefined' ? globalThis : this, function (dates, lists, content) {
    'use strict';
    const text = value => typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
    const items = value => Array.isArray(value) ? value.map(text).filter(Boolean) : [];
    const WIDTH = 1240, HEIGHT = 1754, MARGIN = 80, BOTTOM = 1600;

    function buildModel(trip, options = {}) {
        if (!trip || typeof trip !== 'object') throw new Error('Trip details are unavailable.');
        const title = text(trip.title || trip.name) || 'Trip itinerary';
        const blocks = [{ kind: 'title', text: title }];
        const section = (heading, lines) => {
            if (!lines.length) return;
            blocks.push({ kind: 'heading', text: heading }, ...lines.map(value => ({ kind: 'body', text: value })));
        };
        const config = options.contentConfig || { sections: {} };
        const resolve = key => content.section(trip, config, key);
        const visibleItems = value => Array.isArray(value?.items) ? value.items.filter(item => item && item.enabled !== false) : [];
        const glance = resolve('glance');
        const fallbackGlance = ['Location: ' + text(trip.location || trip.destination),
            ...['duration', 'difficulty', 'distance', 'elevation', 'groupSize'].filter(key => text(trip[key])).map(key => `${({ groupSize: 'Group size' })[key] || key[0].toUpperCase() + key.slice(1)}: ${text(trip[key])}`),
            ...(text(trip.price) ? ['Price: ' + text(trip.price)] : []),
            ...(trip.isActive === false ? ['Currently unavailable for booking.'] : [])];
        if (trip.contentSections?.glance?.mode !== 'hidden' && (glance || config.sections.glance?.mode !== 'hidden')) {
            section(text(glance?.heading) || 'Trip at a glance', glance ? [
                ...visibleItems(glance).map(item => {
                    const value = text(item.field ? trip[item.field] : item.value);
                    return value ? `${text(item.label)}: ${value}` : '';
                }).filter(Boolean),
                ...(text(trip.price) ? ['Price: ' + text(trip.price)] : []),
                ...(trip.isActive === false ? ['Currently unavailable for booking.'] : [])
            ] : fallbackGlance);
        }
        const upcoming = dates.getUpcomingDateRanges(trip, options.referenceDate);
        const selected = dates.parseTripDateRange(options.selectedDate);
        const match = selected && upcoming.find(range => range.key === selected.key);
        section(match ? 'Selected departure' : 'Upcoming departures', match ? [match.fullLabel] : upcoming.length ? upcoming.map(range => range.fullLabel) : ['New dates coming soon. Contact us to confirm.']);
        section('About this trip', items([trip.about || trip.description]));
        const highlights = resolve('highlights');
        section(text(highlights?.heading) || 'Highlights', visibleItems(highlights).map(item => [text(item.title), text(item.description)].filter(Boolean).join('\n')).filter(Boolean));
        for (const extra of content.extraSections(trip)) {
            section(text(extra.heading), extra.items.map(item => [text(item.title), text(item.description)].filter(Boolean).join('\n')));
        }
        const itinerary = Array.isArray(trip.itinerary) ? trip.itinerary.filter(day => day && typeof day === 'object') : [];
        if (!itinerary.length) section('Itinerary', ['Detailed itinerary coming soon. Contact us for details.']);
        itinerary.forEach((day, index) => {
            const lines = [...items([day.description]), ...items(day.activities).map(value => '• ' + value)];
            section(`${text(day.day) || 'Day ' + (index + 1)}${text(day.title) ? ': ' + text(day.title) : ''}`, lines.length ? lines : ['Details to be confirmed.']);
        });
        section('Inclusions', items(trip.includes || trip.inclusions).map(value => '• ' + value));
        section('Exclusions', items(trip.excludes || trip.exclusions).map(value => '• ' + value));
        const boarding = Array.isArray(trip.boardingLocations) && trip.boardingLocations.some(point => point && text(point.name) && text(point.time)) ? trip.boardingLocations : options.boardingPoints || [];
        section('Boarding points', boarding.filter(point => point && text(point.name) && text(point.time)).map(point => [text(point.name), text(point.time), text(point.landmark)].filter(Boolean).join(' — ')));
        section('Things to carry', lists.getItems(trip, 'thingsToCarry').map(value => '• ' + value));
        section('Perfect for', lists.getItems(trip, 'perfectFor'));
        const guidelines = resolve('guidelines');
        section(text(guidelines?.heading) || 'Trip guidelines', visibleItems(guidelines).map(item => [text(item.title), text(item.description)].filter(Boolean).join('\n')).filter(Boolean));
        const cancellation = resolve('cancellation');
        section(text(cancellation?.heading) || 'Cancellation policy', [
            ...visibleItems(cancellation).filter(rule => Number.isFinite(rule.minDays) && Number.isFinite(rule.percent))
                .sort((a, b) => b.minDays - a.minDays).map(rule => `${content.policyLabel(rule)}: ${rule.percent}% cancellation fee`),
            ...items([cancellation?.refundNote, cancellation?.changeNote])
        ]);
        const faqs = resolve('faqs');
        section(text(faqs?.heading) || 'Frequently asked questions', visibleItems(faqs).map(item => [text(item.question), text(item.answer)].filter(Boolean).join('\n')).filter(Boolean));
        const id = text(trip.publicSlug || trip.id);
        const bookingUrl = /^[a-z0-9][a-z0-9_-]*$/.test(id) ? `https://www.teamweekendtrekkers.com/trips/${encodeURIComponent(id)}/` : 'https://www.teamweekendtrekkers.com/trips.html';
        let phone = text(options.whatsapp).replace(/[^0-9]/g, '');
        if (phone.length === 10) phone = '91' + phone;
        section('Booking & enquiries', [bookingUrl, ...(phone ? ['WhatsApp: +' + phone] : []), 'Dates, prices and availability can change. Confirm before booking.']);
        if (blocks.reduce((sum, block) => sum + block.text.length, 0) > 500000) throw new Error('This itinerary is too large to export. Please shorten it.');
        return { title, bookingUrl, filename: `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'trip'}-brochure.pdf`, blocks };
    }

    function wrap(value, measure, maxWidth) {
        const lines = [];
        const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;
        for (const paragraph of value.replace(/\r\n?/g, '\n').split('\n')) {
            let line = '';
            for (const word of paragraph.split(/\s+/).filter(Boolean)) {
                const candidate = line ? line + ' ' + word : word;
                if (measure(candidate) <= maxWidth) { line = candidate; continue; }
                if (line) { lines.push(line); line = ''; }
                for (const part of segmenter ? Array.from(segmenter.segment(word), item => item.segment) : Array.from(word)) {
                    if (line && measure(line + part) > maxWidth) { lines.push(line); line = ''; }
                    line += part;
                }
            }
            lines.push(line);
        }
        return lines;
    }

    // Small image-only PDF encoder: no administrator text is interpolated into PDF syntax.
    function encodePdf(images, bookingUrl) {
        if (!images.length || images.length > 100) throw new Error('Brochure must contain 1–100 pages.');
        const ascii = value => new TextEncoder().encode(value);
        const chunks = [], offsets = [0]; let length = 0;
        const append = value => { const bytes = typeof value === 'string' ? ascii(value) : value; chunks.push(bytes); length += bytes.length; };
        const object = (id, body, stream) => { offsets[id] = length; append(`${id} 0 obj\n${body}`); if (stream) { append('\nstream\n'); append(stream); append('\nendstream'); } append('\nendobj\n'); };
        const safeUrl = /^https:\/\/[A-Za-z0-9._/-]+$/.test(bookingUrl || '') ? bookingUrl : 'https://www.teamweekendtrekkers.com/trips.html';
        append('%PDF-1.4\n');
        object(1, '<< /Type /Catalog /Pages 2 0 R >>');
        object(2, `<< /Type /Pages /Count ${images.length} /Kids [${images.map((_, index) => `${3 + index * 4} 0 R`).join(' ')}] >>`);
        images.forEach((jpeg, index) => {
            if (!(jpeg instanceof Uint8Array) || jpeg[0] !== 255 || jpeg[1] !== 216 || jpeg[jpeg.length - 2] !== 255 || jpeg[jpeg.length - 1] !== 217) throw new Error('Unable to encode brochure image.');
            const id = 3 + index * 4;
            object(id, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 ${id + 1} 0 R >> >> /Contents ${id + 2} 0 R /Annots [${id + 3} 0 R] >>`);
            object(id + 1, `<< /Type /XObject /Subtype /Image /Width ${WIDTH} /Height ${HEIGHT} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>`, jpeg);
            const commands = ascii('q 595.28 0 0 841.89 0 0 cm /Im0 Do Q');
            object(id + 2, `<< /Length ${commands.length} >>`, commands);
            object(id + 3, `<< /Type /Annot /Subtype /Link /Rect [38 18 555 52] /Border [0 0 0] /A << /S /URI /URI (${safeUrl}) >> >>`);
        });
        const start = length, count = 3 + images.length * 4;
        append(`xref\n0 ${count}\n0000000000 65535 f \n`);
        for (let id = 1; id < count; id++) append(`${String(offsets[id]).padStart(10, '0')} 00000 n \n`);
        append(`trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`);
        const result = new Uint8Array(length); let offset = 0;
        chunks.forEach(chunk => { result.set(chunk, offset); offset += chunk.length; });
        return result;
    }

    async function createPdf(model, document, options = {}) {
        const canvas = document.createElement('canvas'); canvas.width = WIDTH; canvas.height = HEIGHT;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('PDF generation is unavailable in this browser.');
        const images = []; let y;
        const startPage = () => {
            if (images.length >= 100) throw new Error('This brochure exceeds 100 pages. Please shorten the itinerary.');
            ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, WIDTH, HEIGHT);
            ctx.fillStyle = '#17442d'; ctx.fillRect(0, 0, WIDTH, 142);
            ctx.fillStyle = '#ed801c'; ctx.fillRect(0, 142, WIDTH, 8);
            ctx.fillStyle = '#fff'; ctx.font = 'bold 36px Arial, sans-serif'; ctx.fillText('Team Weekend Trekkers', MARGIN, 68);
            ctx.fillStyle = '#cee8d9'; ctx.font = '20px Arial, sans-serif'; ctx.fillText('YOUR TRIP GUIDE  /  ITINERARY & ESSENTIALS', MARGIN, 110);
            y = 190;
        };
        const finishPage = async () => {
            ctx.fillStyle = '#eaf4ee'; ctx.fillRect(MARGIN, 1622, WIDTH - MARGIN * 2, 92);
            ctx.fillStyle = '#17442d'; ctx.font = '20px Arial, sans-serif';
            ctx.fillText(model.bookingUrl, MARGIN, 1660);
            ctx.fillText(`Team Weekend Trekkers  •  Page ${images.length + 1}`, MARGIN, 1694);
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92));
            if (!blob) throw new Error('Unable to render brochure. Please try again.');
            images.push(new Uint8Array(await blob.arrayBuffer()));
            if (options.onPage) await options.onPage(blob, images.length);
        };
        startPage();
        for (const [index, block] of model.blocks.entries()) {
            const size = block.kind === 'title' ? 44 : block.kind === 'heading' ? 32 : 26;
            const font = `${block.kind === 'body' ? '' : 'bold '}${size}px Arial, sans-serif`;
            ctx.font = font;
            const lines = wrap(block.text, value => ctx.measureText(value).width, WIDTH - MARGIN * 2 - (block.kind === 'heading' ? 18 : 0));
            // Keep a heading with at least two lines of the following paragraph.
            if (block.kind !== 'body') {
                const next = model.blocks[index + 1];
                ctx.font = '26px Arial, sans-serif';
                const nextLines = next?.kind === 'body' ? Math.min(2, wrap(next.text, value => ctx.measureText(value).width, WIDTH - MARGIN * 2).length) : 0;
                let sectionHeight = 0;
                for (let lookahead = index + 1; model.blocks[lookahead]?.kind === 'body'; lookahead++) {
                    sectionHeight += wrap(model.blocks[lookahead].text, value => ctx.measureText(value).width, WIDTH - MARGIN * 2).length * 36.4 + 10;
                    if (sectionHeight > 420) break;
                }
                const keep = sectionHeight <= 420 ? sectionHeight : nextLines * 36.4;
                if (y + lines.length * size * 1.4 + 56 + keep > BOTTOM && y > 190) { await finishPage(); startPage(); }
            } else if (lines.length * size * 1.4 + 10 <= BOTTOM - 190 && y + lines.length * size * 1.4 + 10 > BOTTOM) {
                await finishPage(); startPage();
            }
            y += block.kind === 'heading' ? 26 : 10;
            for (const line of lines) {
                if (y + size * 1.4 > BOTTOM) { await finishPage(); startPage(); }
                if (block.kind === 'heading') {
                    ctx.fillStyle = '#edf5ef'; ctx.fillRect(MARGIN, y - 2, WIDTH - MARGIN * 2, size * 1.4 + 4);
                    ctx.fillStyle = '#ed801c'; ctx.fillRect(MARGIN, y - 2, 5, size * 1.4 + 4);
                }
                ctx.font = font; ctx.fillStyle = block.kind === 'body' ? '#25382e' : '#17442d';
                ctx.fillText(line, MARGIN + (block.kind === 'heading' ? 18 : 0), y + size); y += size * 1.4;
            }
        }
        await finishPage(); return encodePdf(images, model.bookingUrl);
    }

    function init(document) {
        const button = document.getElementById('tripBrochureButton');
        if (!button || button.dataset.ready) return;
        button.dataset.ready = 'true';
        let generation = 0;
        let pageUrls = [];
        const releasePages = () => { pageUrls.forEach(url => URL.revokeObjectURL(url)); pageUrls = []; };
        document.getElementById('tripBrochureDialog').addEventListener('close', () => {
            generation++; releasePages(); document.getElementById('tripBrochurePreview').replaceChildren();
        });
        const prepare = async () => {
            const request = ++generation;
            const dialog = document.getElementById('tripBrochureDialog');
            const preview = document.getElementById('tripBrochurePreview');
            const status = document.getElementById('tripBrochureStatus');
            const download = document.getElementById('tripBrochureDownload');
            const share = document.getElementById('tripBrochureShare');
            const retry = document.getElementById('tripBrochureRetry');
            download.disabled = true; share.hidden = true; download.onclick = null; share.onclick = null;
            retry.hidden = true; releasePages(); preview.replaceChildren(); preview.setAttribute('aria-busy', 'true'); status.textContent = 'Preparing your PDF…';
            if (!dialog.open) dialog.showModal();
            try {
                const id = getTripFromURL();
                if (!Object.prototype.hasOwnProperty.call(tripsData, id)) throw new Error('Trip details are unavailable.');
                const whatsapp = document.querySelector('.quick-contact .btn-whatsapp')?.href.match(/wa\.me\/(\d+)/)?.[1];
                let contentConfig = globalThis.TRIP_CONTENT_CONFIG;
                try {
                    const response = await fetch('js/trip-content-config.json', { cache: 'no-store', signal: AbortSignal.timeout(8000) });
                    if (response.ok) contentConfig = content.validate(await response.json());
                } catch (_) { /* Use the bundled published settings when offline. */ }
                if (request !== generation || !dialog.open) return;
                const model = buildModel({ id, ...getTripData(id) }, { selectedDate: document.getElementById('dateSelect')?.value, whatsapp, contentConfig, boardingPoints: typeof commonPickupPoints === 'undefined' ? [] : commonPickupPoints });
                let pageCount = 0;
                const bytes = await createPdf(model, document, { onPage: (blob, number) => {
                    if (request !== generation || !dialog.open) throw new Error('Preview closed.');
                    const url = URL.createObjectURL(blob); pageUrls.push(url); pageCount = number;
                    const figure = document.createElement('figure'), image = document.createElement('img'), caption = document.createElement('figcaption');
                    image.src = url; image.alt = `${model.title} - PDF page ${number}`; image.width = WIDTH; image.height = HEIGHT;
                    caption.textContent = `Page ${number}`; figure.append(image, caption); preview.append(figure);
                    status.textContent = `Preparing PDF - ${number} ${number === 1 ? 'page' : 'pages'}…`;
                } });
                if (request !== generation || !dialog.open) return;
                const blob = new Blob([bytes], { type: 'application/pdf' });
                const file = new File([bytes], model.filename, { type: 'application/pdf' });
                download.disabled = false;
                preview.setAttribute('aria-busy', 'false');
                const transcript = document.createElement('details'), summary = document.createElement('summary');
                summary.textContent = 'Read brochure text'; transcript.append(summary);
                model.blocks.forEach(block => {
                    const element = document.createElement(block.kind === 'body' ? 'p' : 'h3');
                    element.textContent = block.text; transcript.append(element);
                });
                preview.append(transcript);
                const size = bytes.length < 1024 * 1024 ? `${Math.ceil(bytes.length / 1024)} KB` : `${(bytes.length / 1024 / 1024).toFixed(1)} MB`;
                status.textContent = `${pageCount} ${pageCount === 1 ? 'page' : 'pages'} · ${size} · PDF ready to download or share.`;
                download.onclick = () => {
                    const url = URL.createObjectURL(blob), link = document.createElement('a');
                    link.href = url; link.download = model.filename; document.body.append(link); link.click(); link.remove();
                    setTimeout(() => URL.revokeObjectURL(url), 60000);
                };
                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    share.hidden = false;
                    share.onclick = async () => { try { await navigator.share({ files: [file], title: model.title }); } catch (error) { if (error.name !== 'AbortError') status.textContent = 'Sharing unavailable. Use Download PDF instead.'; } };
                }
            } catch (_) { if (request === generation && dialog.open) {
                releasePages(); preview.replaceChildren(); preview.setAttribute('aria-busy', 'false');
                status.textContent = 'Could not create the PDF. Please try again.'; retry.hidden = false;
            } }
        };
        button.addEventListener('click', prepare);
        document.getElementById('tripBrochureRetry').addEventListener('click', prepare);
        document.getElementById('tripBrochureClose').addEventListener('click', () => document.getElementById('tripBrochureDialog').close());
    }
    return { buildModel, wrap, encodePdf, createPdf, init };
}));

