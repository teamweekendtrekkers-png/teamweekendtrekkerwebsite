(function(root){
 'use strict';
 function nav(){
  const toggle=document.querySelector('.nav-toggle'),menu=document.querySelector('.nav-menu');
  if(!toggle||!menu)return;
  const backdrop=document.createElement('button');backdrop.className='nav-backdrop';backdrop.setAttribute('aria-label','Close navigation');backdrop.tabIndex=-1;document.body.append(backdrop);
  menu.id=menu.id||'mobile-navigation';toggle.setAttribute('aria-controls',menu.id);toggle.setAttribute('aria-label','Open navigation');toggle.setAttribute('aria-expanded','false');
  const close=()=>{toggle.classList.remove('active');menu.classList.remove('active');document.body.classList.remove('nav-open');toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Open navigation');};
  toggle.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')!=='true';close();if(open){toggle.classList.add('active');menu.classList.add('active');document.body.classList.add('nav-open');toggle.setAttribute('aria-expanded','true');toggle.setAttribute('aria-label','Close navigation');}});
  backdrop.addEventListener('click',()=>{close();toggle.focus();});
  menu.querySelectorAll('a').forEach(link=>link.addEventListener('click',close));
  document.addEventListener('keydown',event=>{
   if(!document.body.classList.contains('nav-open'))return;
   if(event.key==='Escape'){close();toggle.focus();}
   if(event.key==='Tab'){
    const items=[toggle,...menu.querySelectorAll('a,button')].filter(node=>node.getClientRects().length);
    if(!items.length)return;
    const first=items[0],last=items.at(-1);
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
   }
  });
  const wide=matchMedia('(min-width:768px)');wide.addEventListener('change',event=>{if(event.matches)close();});
 }
 function trip(trip){
  const main=document.querySelector('.gallery-main'),image=document.getElementById('galleryMainImg');
  const images=[...new Set((window.allGalleryImages||[trip.image]).filter(Boolean))];
  if(main&&image){
   let index=0,start=null,swiped=false;
   const counter=document.createElement('button');counter.className='gallery-counter';main.querySelector('.gallery-counter')?.remove();main.append(counter);
   const show=()=>{if(window.ResponsiveImages)ResponsiveImages.set(image,images[index],{eager:true,avif:true,focal:trip.imageFocalPoint,sizes:'(max-width:767px) calc(100vw - 36px), (max-width:1000px) calc(100vw - 64px), 960px'});else image.src=images[index];image.alt=trip.title+' — photo '+(index+1);counter.textContent=(index+1)+' / '+images.length+' · View all';};
   main.setAttribute('role','button');main.tabIndex=0;main.setAttribute('aria-label','View trip photos');
   counter.addEventListener('click',event=>{event.stopPropagation();if(window.openLightbox)window.openLightbox(index);});
   main.onkeydown=event=>{if(['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();index=(index+(event.key==='ArrowRight'?1:-1)+images.length)%images.length;show();}else if(event.key==='Enter'||event.key===' '){event.preventDefault();window.openLightbox(index);}};
   main.onclick=()=>{if(swiped){swiped=false;return;}if(window.openLightbox)window.openLightbox(index);};
   main.ontouchstart=event=>{start=event.touches[0];swiped=false;};
   main.ontouchend=event=>{if(!start)return;const end=event.changedTouches[0],dx=end.clientX-start.clientX,dy=end.clientY-start.clientY;start=null;if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)){swiped=true;index=(index+(dx<0?1:-1)+images.length)%images.length;show();}};
   show();
  }
  const table=document.getElementById('pickupTable');if(table){const labels=[...table.querySelectorAll('th')].map(node=>node.textContent.trim());table.querySelectorAll('tbody tr').forEach(row=>[...row.children].forEach((cell,index)=>{cell.dataset.label=labels[index]||'';}));table.querySelectorAll('a').forEach(link=>{link.rel='noopener';link.textContent='Open map';const value=link.getAttribute('href').trim().replace(/^https:\/\/https:\/\//,'https://');try{const url=new URL(value);if(url.protocol==='https:'&&['maps.app.goo.gl','maps.google.com','www.google.com','goo.gl'].includes(url.hostname))link.href=url.href;else link.removeAttribute('href');}catch(_){link.removeAttribute('href');}});}
  const bar=document.getElementById('mobileBookBtn'),select=document.getElementById('dateSelect');
  if(bar&&select&&!bar.dataset.ready){
   bar.dataset.ready='true';const reserve=bar.querySelector('a'),label=bar.querySelector('.float-cta');
   const date=document.createElement('span');date.className='mobile-book-date';bar.querySelector('#floatPrice').append(date);
   const update=()=>{date.textContent=select.value||'Pick your departure';label.textContent=select.value?'Reserve spot':'Choose a date';reserve.setAttribute('aria-label',select.value?'Reserve for '+select.value:'Choose your departure date');};
   select.addEventListener('change',update);update();
   reserve.removeAttribute('onclick');reserve.addEventListener('click',event=>{if(select.value&&window.goToCheckout)window.goToCheckout(event);else{event.preventDefault();document.getElementById('bookingCard').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth',block:'start'});select.focus({preventScroll:true});}});
   const whatsapp=document.createElement('a');whatsapp.className='mobile-whatsapp';whatsapp.href=document.getElementById('whatsappLink')?.href||'https://wa.me/917019235581';whatsapp.setAttribute('aria-label','Ask on WhatsApp');whatsapp.innerHTML='<i class="fab fa-whatsapp" aria-hidden="true"></i>';bar.append(whatsapp);
  }
  const panels=[...document.querySelectorAll('details.mobile-section')];
  const small=matchMedia('(max-width:767px)');
  panels.forEach(panel=>{panel.open=!small.matches;});
  let saved=null;
  window.addEventListener('beforeprint',()=>{saved=panels.map(panel=>panel.open);panels.forEach(panel=>{panel.open=true;});});
  window.addEventListener('afterprint',()=>{if(saved)panels.forEach((panel,index)=>{panel.open=saved[index];});saved=null;});
  document.querySelectorAll('.faq-question,.accordion-header').forEach(header=>{header.setAttribute('role','button');header.tabIndex=0;header.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();header.click();}};});
 }
 document.addEventListener('DOMContentLoaded',nav);
 root.MobileExperience={trip};
}(typeof globalThis!=='undefined'?globalThis:this));
