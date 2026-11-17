// Cloudflare Pages Function: GET /api/pnr?pnr=1234567890
// Calls the same unofficial EaseMyTrip endpoint used by chunkboi/pnr-status (MIT licensed):
//   POST https://railways.easemytrip.com/Train/PnrchkStatus  { pnrNumber: <AES-CBC encrypted PNR, base64> }
// Key and IV are the 16-byte string "8080808080808080" (taken from that repo).
// This is a private endpoint: it can change or block you at any time.

const ENDPOINT = 'https://railways.easemytrip.com/Train/PnrchkStatus';
const KEY_BYTES = new TextEncoder().encode('8080808080808080');

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

// AES-128-CBC, PKCS7 padding (WebCrypto default), base64 output.
async function encryptPnr(pnr) {
  const key = await crypto.subtle.importKey('raw', KEY_BYTES, { name: 'AES-CBC' }, false, ['encrypt']);
  const buf = await crypto.subtle.encrypt({ name: 'AES-CBC', iv: KEY_BYTES }, key, new TextEncoder().encode(pnr));
  let bin = '';
  for (const b of new Uint8Array(buf)) bin += String.fromCharCode(b);
  return btoa(bin);
}

function normalize(d, pnr) {
  const list = Array.isArray(d.passengerList) ? d.passengerList : [];
  return {
    pnr,
    from: d.BrdPointName || '',
    to: d.DestStnName || '',
    trainNumber: String(d.trainNumber || ''),
    trainName: d.trainName || '',
    doj: d.dateOfJourney || '',
    travelClass: d.className || '',
    quota: d.quota || '',
    boarding: d.BrdPointName || '',
    chartStatus: '',
    passengers: list.map((p, i) => ({
      number: p.passengerSerialNumber || i + 1,
      booking: [p.currentCoachId, p.currentBerthNo].filter(v => v != null && v !== '' && v !== 0).join(' / '),
      current: p.currentStatus || '',
    })),
  };
}

export async function onRequestGet({ request }) {
  const pnr = new URL(request.url).searchParams.get('pnr') || '';
  if (!/^\d{10}$/.test(pnr)) return json({ error: 'PNR must be exactly 10 digits.' }, 400);

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ pnrNumber: await encryptPnr(pnr) }),
    });
    if (res.status === 429) return json({ error: 'Too many requests. Try again shortly.' }, 429);
    if (!res.ok) return json({ error: 'Status provider is unavailable right now.' }, 502);

    let data = JSON.parse(await res.text());
    if (typeof data === 'string') data = JSON.parse(data);   // some responses are double-encoded
    data = data || {};

    const out = normalize(data, pnr);
    if (!out.trainNumber && !out.passengers.length) {
      return json({ error: 'No details found. The PNR may be invalid or flushed.' }, 404);
    }
    return json(out);
  } catch {
    return json({ error: 'Could not reach the status provider.' }, 502);
  }
}
