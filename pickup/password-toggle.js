'use strict';
for (const button of document.querySelectorAll('[data-password]')) {
  const input = document.getElementById(button.dataset.password);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('aria-hidden', 'true');
  const path = data => {
    const node = document.createElementNS(svg.namespaceURI, 'path');
    node.setAttribute('d', data);
    return node;
  };
  const slash = path('M3 3l18 18');
  slash.style.display = 'none';
  svg.append(path('M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z'),
    path('M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z'), slash);
  button.append(svg);
  const reveal = shown => {
    input.type = shown ? 'text' : 'password';
    button.setAttribute('aria-pressed', String(shown));
    button.setAttribute('aria-label', shown ? 'Hide password' : 'Show password');
    slash.style.display = shown ? '' : 'none';
  };
  button.addEventListener('click', () => reveal(input.type === 'password'));
  input.form.addEventListener('submit', () => reveal(false));
}
