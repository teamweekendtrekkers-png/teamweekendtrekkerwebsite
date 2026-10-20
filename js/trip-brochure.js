// Offline itinerary brochures. Canvas preserves the browser's Unicode/emoji fonts.
(function (root, factory) {
    const api = factory(typeof module === 'object' && module.exports ? require('./trip-date-utils') : root.TripDateUtils,
        typeof module === 'object' && module.exports ? require('./trip-detail-lists') : root.TripDetailLists,
        typeof module === 'object' && module.exports ? require('./trip-content') : root.TripContent, typeof module === 'object' && module.exports ? require('./inline-format') : root.TripText);
    if (typeof module === 'object' && module.exports) module.exports = api;
    else { root.TripBrochure = api; document.addEventListener('DOMContentLoaded', () => api.init(document)); }
}(typeof globalThis !== 'undefined' ? globalThis : this, function (dates, lists, content, textFormat) {
    'use strict';
    const text = value => typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
    const items = value => Array.isArray(value) ? value.map(text).filter(Boolean) : [];
    const WIDTH = 1240, HEIGHT = 1754, MARGIN = 80, BOTTOM = 1600;

    function buildModel(trip, options = {}) {
        if (!trip || typeof trip !== 'object') throw new Error('Trip details are unavailable.');
        const title = text(trip.title || trip.name) || 'Trip itinerary';
        const blocks = [{ kind: 'title', text: title }];
        const section = (heading, lines, metadata = {}) => {
            if (!lines.length) return;
            blocks.push({ kind: 'heading', text: heading, ...metadata }, ...lines.map(value => ({ kind: 'body', text: value })));
        };
        const config = options.contentConfig || { sections: {} };
        const resolve = key => content.section(trip, config, key);
        const visibleItems = value => Array.isArray(value?.items) ? value.items.filter(item => item && item.enabled !== false) : [];
        const glance = resolve('glance');
        const fallbackGlance = ['Location: ' + text(trip.location || trip.destination),
            ...['duration', 'difficulty', 'distance', 'elevation', 'groupSize'].filter(key => text(trip[key])).map(key => `${({ groupSize: 'Group size' })[key] || key[0].toUpperCase() + key.slice(1)}: ${text(trip[key])}`),
            ...(!trip.hidePrice && text(trip.price) ? ['Price: ' + text(trip.price)] : []),
            ...(trip.isActive === false ? ['Currently unavailable for booking.'] : [])];
        if (trip.contentSections?.glance?.mode !== 'hidden' && (glance || config.sections.glance?.mode !== 'hidden')) {
            section(text(glance?.heading) || 'Trip at a glance', glance ? [
                ...visibleItems(glance).map(item => {
                    const value = text(item.field ? trip[item.field] : item.value);
                    return value ? `${text(item.label)}: ${value}` : '';
                }).filter(Boolean),
                ...(!trip.hidePrice && text(trip.price) ? ['Price: ' + text(trip.price)] : []),
                ...(trip.isActive === false ? ['Currently unavailable for booking.'] : [])
            ] : fallbackGlance);
        }
        const upcoming = dates.getUpcomingDateRanges(trip, options.referenceDate);
        const selected = dates.parseTripDateRange(options.selectedDate);
        const match = selected && upcoming.find(range => range.key === selected.key);
        section(match ? 'Selected departure' : 'Upcoming departures', match ? [match.fullLabel] : upcoming.length ? upcoming.map(range => range.fullLabel) : [dates.unavailableDateLabel(trip, options.referenceDate) + '. Contact us to confirm.']);
        section('About this trip', items([trip.about || trip.description]));
        const highlights = resolve('highlights');
        section(text(highlights?.heading) || 'Highlights', visibleItems(highlights).map(item => [text(item.title), text(item.description)].filter(Boolean).join('\n')).filter(Boolean));
        const itinerary = Array.isArray(trip.itinerary) ? trip.itinerary.filter(day => day && typeof day === 'object') : [];
        if (!itinerary.length) section('Itinerary', ['Detailed itinerary coming soon. Contact us for details.']);
        itinerary.forEach((day, index) => {
            const lines = [...items([day.description]), ...items(day.activities).map(value => '• ' + value)];
            section(`${text(day.day) || 'Day ' + (index + 1)}${text(day.title) ? ': ' + text(day.title) : ''}`, lines.length ? lines : ['Details to be confirmed.'], { group: 'itinerary' });
        });
        section('Inclusions', items(trip.includes || trip.inclusions).map(value => '• ' + value), {group:'inclusions'});
        section('Exclusions', items(trip.excludes || trip.exclusions).map(value => '• ' + value), {group:'exclusions'});
        const boarding = Array.isArray(trip.boardingLocations) && trip.boardingLocations.some(point => point && text(point.name) && text(point.time)) ? trip.boardingLocations : options.boardingPoints || [];
        section('Boarding points', boarding.filter(point => point && text(point.name) && text(point.time)).map(point => [text(point.name), text(point.time), text(point.landmark)].filter(Boolean).join(' — ')));
        section('Things to carry', lists.getItems(trip, 'thingsToCarry').map(value => '• ' + value), {group:'packing'});
        section('Perfect for', lists.getItems(trip, 'perfectFor'), {group:'audience'});
        for (const extra of content.extraSections(trip)) {
            section(text(extra.heading), extra.items.map(item => [text(item.title), text(item.description)].filter(Boolean).join('\n')));
        }
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
        section('Booking & enquiries', [bookingUrl, ...(phone ? ['WhatsApp: +' + phone] : []), 'Dates, prices and availability can change. Confirm before booking.'], {group:'contacts'});
        if (blocks.reduce((sum, block) => sum + block.text.length, 0) > 500000) throw new Error('This itinerary is too large to export. Please shorten it.');
        const priceNumber = value => { const raw=text(value).replace(/[^0-9.]/g, '');return raw ? Number(raw) : NaN; };
        const sellingPrice=priceNumber(trip.price),originalPrice=priceNumber(trip.originalPrice);
        const price=!trip.hidePrice && Number.isFinite(sellingPrice) && sellingPrice>0 ? sellingPrice : null;
        const original=price!==null && Number.isFinite(originalPrice) && originalPrice>price ? originalPrice : null;
        const facts=glance ? visibleItems(glance).map(item=>({label:text(item.label),value:text(item.field?trip[item.field]:item.value)})).filter(item=>item.value).slice(0,4)
            : trip.contentSections?.glance?.mode==='hidden'||config.sections.glance?.mode==='hidden' ? []
            : [['Duration',trip.duration],['Activity level',trip.difficulty],['Departing from',trip.departureCity],['Location',trip.location]].filter(([,value])=>text(value)).map(([label,value])=>({label,value:text(value)}));
        const selectedBookingUrl=bookingUrl+(match?'?date='+encodeURIComponent(match.originalLabel):'');
        return { title, bookingUrl, selectedBookingUrl, whatsappUrl:phone?'https://wa.me/'+phone:'', cover:{image:text(trip.cardImage||items(trip.galleryImages)[0]||trip.image),focal:['top','bottom','left','right'].includes(trip.imageFocalPoint)?trip.imageFocalPoint:'center',location:text(trip.location||trip.destination),price,originalPrice:original,facts,
            departure:match?match.fullLabel:upcoming[0]?.fullLabel||dates.unavailableDateLabel(trip,options.referenceDate),
            departureLabel:match?'SELECTED DEPARTURE':upcoming.length?'NEXT DEPARTURE':'DEPARTURES'}, filename: `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'trip'}-brochure.pdf`, blocks };
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

    // Raster artwork retains browser-rendered emojis; a Unicode text layer makes
    // the same visible lines searchable/selectable without external PDF libraries.
    function encodePdf(images, bookingUrl, options = {}) {
        if (!images.length || images.length > 100) throw new Error('Brochure must contain 1–100 pages.');
        const ascii = value => new TextEncoder().encode(value);
        const hex = value => Array.from(ascii(value), byte=>byte.toString(16).padStart(2,'0')).join('');
        const unicode = value => Array.from({length:value.length},(_,i)=>value.charCodeAt(i).toString(16).padStart(4,'0')).join('');
        const safeLink = (value, fallback) => {
            try { const url=new URL(value);return url.protocol==='https:' && ['www.teamweekendtrekkers.com','wa.me'].includes(url.hostname) && !url.username && !url.password ? url.href : fallback; } catch { return fallback; }
        };
        const tripUrl=safeLink(options.selectedBookingUrl||bookingUrl,'https://www.teamweekendtrekkers.com/trips.html');
        const whatsapp=safeLink(options.whatsappUrl,'');
        const fonts=[], layers=[];
        const glyphFont=(glyph,bold,width,italic=false)=>{
            let font=fonts.find(font=>font.bold===bold && font.italic===italic && font.glyphs.has(glyph));
            if(!font)font=fonts.find(font=>font.bold===bold && font.italic===italic && font.glyphs.size<255);
            if(!font){font={bold,italic,glyphs:new Map(),widths:[],name:'F'+(fonts.length+1)};fonts.push(font);}
            if(!font.glyphs.has(glyph)){font.glyphs.set(glyph,font.glyphs.size+1);font.widths.push(Math.max(1,Math.round(width)));}
            return {font,code:font.glyphs.get(glyph)};
        };
        const segmenter=typeof Intl.Segmenter==='function'?new Intl.Segmenter(undefined,{granularity:'grapheme'}):null;
        for(const [pageIndex,lines] of (options.textPages||[]).entries()){
            const commands=[];
            for(const line of lines){
                let x=line.x,run=null;
                const glyphs=segmenter?Array.from(segmenter.segment(line.text),part=>part.segment):Array.from(line.text);
                glyphs.forEach((glyph,index)=>{
                    const advance=line.advances[index]||line.size*.5;
                    const {font,code}=glyphFont(glyph,!!line.bold,advance/line.size*1000,!!line.italic);
                    if(!run||run.font!==font){run={font,x,hex:''};commands.push(run);}
                    run.hex+=code.toString(16).padStart(2,'0');x+=advance;
                });
                for(const run of commands.splice(0))layers.push({page:pageIndex,line,run});
            }
        }
        // Allocate objects before serializing so page/font references stay exact.
        let next=3;
        const pages=images.map(()=>({page:next++,image:next++,content:next++,booking:next++,whatsapp:whatsapp?next++:null}));
        fonts.forEach(font=>{font.object=next++;font.cmap=next++;});
        const info=next++,chunks=[],offsets=[0];let length=0;
        const append=value=>{const bytes=typeof value==='string'?ascii(value):value;chunks.push(bytes);length+=bytes.length;};
        const object=(id,body,stream)=>{offsets[id]=length;append(id+' 0 obj\n'+body);if(stream){append('\nstream\n');append(stream);append('\nendstream');}append('\nendobj\n');};
        append('%PDF-1.4\n');
        object(1,'<< /Type /Catalog /Pages 2 0 R /Lang (en-IN) >>');
        object(2,'<< /Type /Pages /Count '+pages.length+' /Kids ['+pages.map(page=>page.page+' 0 R').join(' ')+'] >>');
        pages.forEach((page,index)=>{
            const jpeg=images[index];
            if(!(jpeg instanceof Uint8Array)||jpeg[0]!==255||jpeg[1]!==216||jpeg[jpeg.length-2]!==255||jpeg[jpeg.length-1]!==217)throw new Error('Unable to encode brochure image.');
            const resources=fonts.length?' /Font << '+fonts.map(font=>'/'+font.name+' '+font.object+' 0 R').join(' ')+' >>':'';
            object(page.page,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 '+page.image+' 0 R >>'+resources+' >> /Contents '+page.content+' 0 R /Annots ['+page.booking+' 0 R'+(page.whatsapp?' '+page.whatsapp+' 0 R':'')+'] >>');
            object(page.image,'<< /Type /XObject /Subtype /Image /Width '+WIDTH+' /Height '+HEIGHT+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+jpeg.length+' >>',jpeg);
            const sx=595.28/WIDTH,sy=841.89/HEIGHT;
            const lines=layers.filter(layer=>(layer.page||0)===index).map(({line,run})=>'BT /'+run.font.name+' '+(line.size*sy).toFixed(4)+' Tf 3 Tr 1 0 0 1 '+(run.x*sx).toFixed(4)+' '+((HEIGHT-line.y)*sy).toFixed(4)+' Tm <'+run.hex+'> Tj ET');
            const commands=ascii('q 595.28 0 0 841.89 0 0 cm /Im0 Do Q\n'+lines.join('\n'));
            object(page.content,'<< /Length '+commands.length+' >>',commands);
            const annotation=(id,url,x,w)=>object(id,'<< /Type /Annot /Subtype /Link /Rect ['+(x*sx).toFixed(2)+' '+((HEIGHT-1684)*sy).toFixed(2)+' '+((x+w)*sx).toFixed(2)+' '+((HEIGHT-1620)*sy).toFixed(2)+'] /Border [0 0 0] /A << /S /URI /URI <'+hex(url)+'> >> >>');
            annotation(page.booking,tripUrl,80,whatsapp?660:1080);
            if(page.whatsapp)annotation(page.whatsapp,whatsapp,760,400);
        });
        fonts.forEach(font=>{
            const pairs=[...font.glyphs].map(([glyph,code])=>'<'+code.toString(16).padStart(2,'0')+'> <'+unicode(glyph)+'>');
            let mapping='';
            for(let i=0;i<pairs.length;i+=100){const group=pairs.slice(i,i+100);mapping+=group.length+' beginbfchar\n'+group.join('\n')+'\nendbfchar\n';}
            const cmap=ascii('/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n/CMapName /BrochureUnicode def\n/CMapType 2 def\n1 begincodespacerange\n<01> <FF>\nendcodespacerange\n'+mapping+'endcmap\nCMapName currentdict /CMap defineresource pop\nend\nend');
            object(font.object,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica'+(font.bold&&font.italic?'-BoldOblique':font.bold?'-Bold':font.italic?'-Oblique':'')+' /Encoding /WinAnsiEncoding /FirstChar 1 /LastChar '+font.glyphs.size+' /Widths ['+font.widths.join(' ')+'] /ToUnicode '+font.cmap+' 0 R >>');
            object(font.cmap,'<< /Length '+cmap.length+' >>',cmap);
        });
        object(info,'<< /Title <FEFF'+unicode(textFormat?textFormat.plain(options.title||'Trip brochure'):options.title||'Trip brochure')+'> /Author (Team Weekend Trekkers) /Subject (Trip itinerary and travel essentials) >>');
        const start=length;
        append('xref\n0 '+next+'\n0000000000 65535 f \n');
        for(let id=1;id<next;id++)append(String(offsets[id]).padStart(10,'0')+' 00000 n \n');
        append('trailer\n<< /Size '+next+' /Root 1 0 R /Info '+info+' 0 R >>\nstartxref\n'+start+'\n%%EOF\n');
        const result=new Uint8Array(length);let offset=0;
        chunks.forEach(chunk=>{result.set(chunk,offset);offset+=chunk.length;});return result;
    }

    async function createPdf(model, document, options = {}) {
        const canvas=document.createElement('canvas');canvas.width=WIDTH;canvas.height=HEIGHT;
        const ctx=canvas.getContext('2d');if(!ctx)throw new Error('PDF generation is unavailable in this browser.');
        if(document.fonts?.ready)await Promise.race([document.fonts.ready,new Promise(resolve=>setTimeout(resolve,2500))]);
        const images=[],textPages=[];let pageText=[],y=190,activeDay='';
        const palette={forest:'#173f35',teal:'#087f73',sage:'#e8f3ec',cream:'#fff8ef',ink:'#253b33',muted:'#53695f',line:'#cfdfd5'};
        const segmenter=typeof Intl.Segmenter==='function'?new Intl.Segmenter(undefined,{granularity:'grapheme'}):null;
        const font=(size,bold,italic=false)=>{ctx.font=(italic?'italic ':'')+(bold?'bold ':'')+size+'px Arial, sans-serif';};
        const draw=(value,x,baseline,size=25,bold=false,color=palette.ink,italic=false)=>{
            value=textFormat?textFormat.plain(value):String(value);font(size,bold,italic);ctx.fillStyle=color;ctx.fillText(value,x,baseline);
            const glyphs=segmenter?Array.from(segmenter.segment(value),part=>part.segment):Array.from(value);
            pageText.push({text:value,x,y:baseline,size,bold,italic,advances:glyphs.map(glyph=>ctx.measureText(glyph).width)});
        };
        const rectangle=(x,top,width,height,color,radius=16)=>{
            ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,top,width,height,radius);ctx.fill();
        };
        const clippedLabel=(value,maxWidth,size,bold)=>{
            font(size,bold);let label=value;
            while(label.length&&ctx.measureText(label).width>maxWidth)label=label.slice(0,-1);
            return label===value?label:label.trim()+'…';
        };
        const safeImage=value=>{
            try{const url=new URL(value,document.baseURI);return url.origin===new URL(document.baseURI).origin&&/\/images\//.test(url.pathname)&&/\.(png|jpe?g|webp|avif)$/i.test(url.pathname)?url.href:null;}catch{return null;}
        };
        const loadImage=async value=>{
            const url=safeImage(value);if(!url)return null;
            let objectUrl;
            try{
                const response=await fetch(url,{signal:AbortSignal.timeout(8000)});if(!response.ok)return null;
                const blob=await response.blob();if(blob.size>12*1024*1024)return null;
                objectUrl=URL.createObjectURL(blob);
                const image=document.createElement('img');image.src=objectUrl;await image.decode();return image;
            }catch{return null;}finally{if(objectUrl)URL.revokeObjectURL(objectUrl);}
        };
        const [hero,logo]=await Promise.all([loadImage(model.cover?.image),loadImage('images/logo.jpg')]);
        const header=(cover=false)=>{
            if(images.length>=100)throw new Error('This brochure exceeds 100 pages. Please shorten the itinerary.');
            ctx.fillStyle='#fff';ctx.fillRect(0,0,WIDTH,HEIGHT);pageText=[];
            if(cover){
                if(logo){ctx.save();ctx.beginPath();ctx.arc(114,72,34,0,Math.PI*2);ctx.clip();ctx.drawImage(logo,80,38,68,68);ctx.restore();}
                draw('Team Weekend Trekkers',logo?166:MARGIN,70,32,true,palette.forest);
                draw('WEEKEND PLANS. LASTING MEMORIES.',logo?166:MARGIN,103,17,false,palette.muted);
            }else{
                draw('TEAM WEEKEND TREKKERS',MARGIN,58,23,true,palette.teal);
                draw(clippedLabel(model.title,WIDTH-MARGIN*2,25,true),MARGIN,100,25,true,palette.forest);
            }
            ctx.fillStyle=palette.line;ctx.fillRect(MARGIN,132,WIDTH-MARGIN*2,2);y=176;
        };
        const finish=async()=>{
            rectangle(MARGIN,1620,model.whatsappUrl?660:1080,64,palette.forest,12);
            draw('View dates & book',MARGIN+22,1661,23,true,'#fff');
            if(model.whatsappUrl){rectangle(760,1620,400,64,palette.sage,12);draw('WhatsApp: +'+model.whatsappUrl.split('/').pop(),782,1661,21,true,palette.forest);}
            draw(clippedLabel(model.bookingUrl,1080,15,false),MARGIN,1710,15,false,palette.muted);
            draw('Dates, prices and availability can change. Confirm before booking.',MARGIN,1738,15,false,palette.muted);
            draw('Page '+(images.length+1),1075,1738,15,false,palette.muted);
            const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.9));if(!blob)throw new Error('Unable to render brochure. Please try again.');
            images.push(new Uint8Array(await blob.arrayBuffer()));textPages.push(pageText);
            if(options.onPage)await options.onPage(blob,images.length);
        };
        const newPage=async(continued=false)=>{await finish();header();if(continued&&activeDay){draw(clippedLabel(activeDay+' (continued)',1080,22,true),MARGIN,187,22,true,palette.teal);y=215;}};
        const ensure=async(height,continued=false)=>{if(y+height>BOTTOM&&y>176)await newPage(continued);};
        const paragraph=async(value,{size=25,bold=false,color=palette.ink,indent=0,gap=9}={})=>{
            const tokens=textFormat?textFormat.runs(value,bold):[{text:String(value),bold,italic:false}];
            const lines=[];let line=[],width=0;
            const trim=units=>{while(units.length&&/\s/u.test(units.at(-1).ch))units.pop();return units;};
            for(const run of tokens){
                font(size,run.bold,run.italic);
                const glyphs=segmenter?Array.from(segmenter.segment(run.text),part=>part.segment):Array.from(run.text);
                for(const ch of glyphs){
                    if(ch==='\r')continue;
                    if(ch==='\n'){lines.push(trim(line));line=[];width=0;continue;}
                    const unit={ch,bold:run.bold,italic:run.italic,width:ctx.measureText(ch).width};
                    if(!line.length&&/\s/u.test(ch))continue;
                    if(width+unit.width>WIDTH-MARGIN*2-indent&&line.length){
                        let at=-1;for(let i=line.length-1;i>=0;i--)if(/\s/u.test(line[i].ch)){at=i;break;}
                        if(at>=0){lines.push(trim(line.slice(0,at)));line=line.slice(at+1);}else{lines.push(line);line=[];}
                        width=line.reduce((sum,item)=>sum+item.width,0);
                    }
                    if(!line.length&&/\s/u.test(ch))continue;
                    line.push(unit);width+=unit.width;
                }
            }
            if(line.length)lines.push(trim(line));
            for(const line of lines){
                await ensure(size*1.4,true);let x=MARGIN+indent,run=null;
                const output=[];
                for(const unit of line){if(!run||run.bold!==unit.bold||run.italic!==unit.italic){run={text:'',bold:unit.bold,italic:unit.italic,width:0};output.push(run);}run.text+=unit.ch;run.width+=unit.width;}
                for(const run of output){draw(run.text,x,y+size,size,run.bold,color,run.italic);x+=run.width;}
                y+=line.length?size*1.4:size*.65;
            }
            y+=gap;
        };
        header(true);
        if(hero){
            const top=y,height=420,width=WIDTH-MARGIN*2,scale=Math.max(width/hero.naturalWidth,height/hero.naturalHeight);
            ctx.save();ctx.beginPath();ctx.roundRect(MARGIN,top,width,height,22);ctx.clip();
            const focus=model.cover?.focal;
            const dx=focus==='left'?0:focus==='right'?width-hero.naturalWidth*scale:(width-hero.naturalWidth*scale)/2;
            const dy=focus==='top'?0:focus==='bottom'?height-hero.naturalHeight*scale:(height-hero.naturalHeight*scale)/2;
            ctx.drawImage(hero,MARGIN+dx,top+dy,hero.naturalWidth*scale,hero.naturalHeight*scale);ctx.restore();y+=450;
        }else{
            rectangle(MARGIN,y,1080,150,palette.forest,22);draw('YOUR NEXT WEEKEND STARTS HERE',MARGIN+30,y+88,30,true,'#fff');y+=180;
        }
        await paragraph(model.title,{size:44,bold:true,color:palette.forest,gap:12});
        if(model.cover?.location)await paragraph(model.cover.location,{size:26,color:palette.muted,gap:18});
        if(model.cover?.departure){
            await ensure(104);rectangle(MARGIN,y,1080,100,palette.sage,14);
            draw(model.cover.departureLabel,MARGIN+22,y+29,17,true,palette.teal);
            draw(model.cover.departure,MARGIN+22,y+70,29,true,palette.forest);y+=122;
        }
        const facts=model.cover?.facts||[];
        for(let index=0;index<facts.length;index+=2){
            const pair=facts.slice(index,index+2);let height=90;
            const rows=pair.map(fact=>{font(24,true);const lines=wrap(fact.value,line=>ctx.measureText(line).width,478);height=Math.max(height,46+lines.length*32);return {fact,lines};});
            await ensure(height+16);
            rows.forEach(({fact,lines},col)=>{const x=MARGIN+col*552;rectangle(x,y,528,height,palette.cream,12);draw(fact.label.toUpperCase(),x+18,y+27,16,true,palette.muted);lines.forEach((line,i)=>draw(line,x+18,y+61+i*32,24,true,palette.forest));});y+=height+16;
        }
        if(model.cover?.price!==null&&model.cover?.price!==undefined){
            await ensure(124);rectangle(MARGIN,y,1080,112,palette.sage,14);
            const money=value=>'₹'+Number(value).toLocaleString('en-IN',{maximumFractionDigits:2});
            draw('PRICE PER PERSON',MARGIN+22,y+28,17,true,palette.teal);
            draw(money(model.cover.price),MARGIN+22,y+83,43,true,palette.forest);
            if(model.cover.originalPrice){
                const original=money(model.cover.originalPrice);font(28,false);const width=ctx.measureText(original).width;
                draw(original,MARGIN+370,y+75,28,false,palette.muted);ctx.strokeStyle=palette.muted;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(MARGIN+370,y+65);ctx.lineTo(MARGIN+370+width,y+65);ctx.stroke();
                draw('Save '+money(model.cover.originalPrice-model.cover.price),MARGIN+630,y+75,24,true,palette.teal);
            }y+=130;
        }
        await finish();header();
        const columnPair=async(left,right)=>{
            const prepare=section=>{
                font(26,true);const heading=wrap(section.heading,line=>ctx.measureText(line).width,486);
                font(24,false);const paragraphs=section.lines.map(value=>wrap(value,line=>ctx.measureText(line).width,486));
                const headerHeight=heading.length*36+18;
                const height=headerHeight+16+paragraphs.reduce((sum,lines)=>sum+lines.length*33.6+10,0);
                return {heading,paragraphs,headerHeight,height};
            };
            const columns=[prepare(left),prepare(right)],height=Math.max(...columns.map(column=>column.height));
            if(height>1300)return false;
            activeDay='';await ensure(height+30);y+=22;const top=y;
            columns.forEach((column,index)=>{
                const x=MARGIN+index*558;
                rectangle(x,top,522,column.headerHeight,index?palette.cream:palette.sage,12);
                column.heading.forEach((line,i)=>draw(line,x+18,top+32+i*36,26,true,palette.forest));
                let baseline=top+column.headerHeight+39;
                column.paragraphs.forEach(lines=>{lines.forEach(line=>{if(line)draw(line,x+18,baseline,24,false,palette.ink);baseline+=33.6;});baseline+=10;});
            });
            y=top+height+12;return true;
        };
        for(let index=0;index<model.blocks.length;index++){
            const block=model.blocks[index];
            if(block.kind==='title')continue;
            if(block.group==='contacts')break;
            if(block.group==='inclusions'||block.group==='packing'){
                let end=index+1;while(model.blocks[end]?.kind==='body')end++;
                const partner=model.blocks[end];
                if(partner?.group===(block.group==='inclusions'?'exclusions':'audience')){
                    let last=end+1;while(model.blocks[last]?.kind==='body')last++;
                    if(await columnPair({heading:block.text,lines:model.blocks.slice(index+1,end).map(item=>item.text)},{heading:partner.text,lines:model.blocks.slice(end+1,last).map(item=>item.text)})){index=last-1;continue;}
                }
            }
            const heading=block.kind!=='body';
            if(heading){
                activeDay=block.group==='itinerary'?block.text:'';
                const size=block.group==='itinerary'?29:28;font(size,true);
                const lines=wrap(textFormat?textFormat.plain(block.text):block.text,line=>ctx.measureText(line).width,1036);
                let nextHeight=0;
                for(let look=index+1;model.blocks[look]?.kind==='body';look++){
                    font(25,false);nextHeight+=wrap(model.blocks[look].text,line=>ctx.measureText(line).width,1062).length*35+9;if(nextHeight>340)break;
                }
                const required=lines.length*41+50+(nextHeight<=340?nextHeight:105);
                await ensure(required);y+=22;
                const height=lines.length*41+18;
                rectangle(MARGIN,y,1080,height,block.group==='itinerary'?palette.forest:palette.sage,12);
                lines.forEach((line,i)=>draw(line,MARGIN+22,y+34+i*41,size,true,block.group==='itinerary'?'#fff':palette.forest));
                y+=height+15;
            }else{
                font(25,false);const bullet=/^[•✓✗]/u.test(block.text),indent=bullet?16:0;
                const lines=wrap(textFormat?textFormat.plain(block.text):block.text,line=>ctx.measureText(line).width,1080-indent);
                const needed=lines.length*35+9;
                if(needed<BOTTOM-230)await ensure(needed,true);
                await paragraph(block.text,{size:25,indent});
            }
        }
        await finish();
        return encodePdf(images,model.bookingUrl,{textPages,title:model.title,selectedBookingUrl:model.selectedBookingUrl,whatsappUrl:model.whatsappUrl});
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
                    if(textFormat)textFormat.set(element,block.text);else element.textContent = block.text; transcript.append(element);
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


