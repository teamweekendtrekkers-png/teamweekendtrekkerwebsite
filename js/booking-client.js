(function () {
  'use strict';
  const originalSubmit = window.submitDetails;
  const configPromise = fetch('js/booking-config.json', {cache: 'no-cache', signal: AbortSignal.timeout(8000)})
    .then(response => {if (!response.ok) throw new Error('Configuration unavailable'); return response.json();});
  // Avoid an unhandled rejection before the visitor submits the form.
  configPromise.catch(() => {});
  const value = id => document.getElementById(id).value.trim();
  async function requestKey(payload) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(payload)));
    const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
    const storageKey = 'twt-request-' + hash;
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) return saved;
      const key = crypto.randomUUID(); sessionStorage.setItem(storageKey, key); return key;
    } catch {
      window.twtRequestKeys = window.twtRequestKeys || {};
      return window.twtRequestKeys[hash] || (window.twtRequestKeys[hash] = crypto.randomUUID());
    }
  }
  window.submitDetails = async function () {
    if (!validateForm()) return;
    const button = document.getElementById('submitDetailsBtn');
    try {
      const config = await configPromise;
      if (config.enabled === false) return await originalSubmit();
      if (config.enabled !== true || !config.anonKey || config.endpoint !== 'https://vdxunrhcahgkwtzvjjdj.supabase.co/functions/v1/booking-request') {
        throw new Error('Booking service is not ready. Please contact our team on WhatsApp.');
      }
      const booking = window.bookingData;
      const payload = {trip_id: getTripFromURL(), departure_label: booking.date, travellers: booking.people,
        full_name: value('fullName'), email: value('email'), phone: value('phone'), alternate_phone: value('altPhone'),
        participant_names: value('participants').split(/[,\n]/).map(name => name.trim()).filter(Boolean),
        special_requests: window.PaymentOptions ? window.PaymentOptions.reportText(booking.paymentReport, value('notes')) : value('notes'), coupon_code: booking.coupon || '', expected_total: booking.total};
      payload.idempotency_key = await requestKey(payload);
      document.getElementById('bookingIssue').hidden = true;
      button.disabled = true;
      button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving request...';
      const response = await fetch(config.endpoint, {method: 'POST', signal: AbortSignal.timeout(35000),
        headers: {'Content-Type': 'application/json', Authorization: 'Bearer ' + config.anonKey, apikey: config.anonKey},
        body: JSON.stringify(payload)});
      const result = await response.json();
      if (!response.ok || result.accepted !== true || typeof result.booking_reference !== 'string') {
        const messages = {booking_request_unavailable: 'This trip accepts UPI payment submissions. Please return to payment or contact our team.', invalid_request: 'Check your contact details and selected trip.', departure_unavailable: 'This departure is no longer available. Please select another date.',
          quote_changed: 'The trip price or coupon has changed. Reload and review your total before submitting.', rate_limited: 'Too many requests. Please wait a few minutes or contact our team.',
          request_conflict: 'This request changed during a retry. Reload and review your details.',
          direct_payment_unavailable: 'Direct payment is no longer enabled for this departure. If you have paid, share your transaction ID and receipt with our team on WhatsApp.'};
        throw new Error(messages[result.error] || 'Your request could not be saved. Please retry or contact our team on WhatsApp.');
      }
      window.bookingData.bookingReference = result.booking_reference;
      showPaymentSection();
      for (const parent of [document.getElementById('submitSuccess'), document.getElementById('requestReceived')]) {
        let reference = parent.querySelector('[data-booking-reference]');
        if (!reference) {reference = document.createElement('p'); reference.dataset.bookingReference = ''; parent.append(reference);}
        reference.textContent = 'Booking reference: ' + result.booking_reference;
      }
      button.innerHTML = '<i class="fas fa-check"></i> Request Saved!';
    } catch (error) {
      button.disabled = false;
      button.innerHTML = '<i class="fas fa-paper-plane"></i> Send Booking Request';
      const issue = document.getElementById('bookingIssue'); issue.hidden = false;
      issue.textContent = error.name === 'TimeoutError' || error.name === 'AbortError'
        ? 'We could not confirm the response. Retry with the same details; your request will not be saved twice.'
        : (error.message || 'Unable to save your request. Please retry or contact our team on WhatsApp.');
    }
  };
}());
