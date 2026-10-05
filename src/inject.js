// ITIN Enrollment Helper for Chase
//
// Runs inside the page (world: MAIN) before any of Chase's own scripts load.
// Chase's online-banking enrollment form only has an SSN field, but the
// enrollment endpoint also accepts a `tin` field. This script renames the
// `ssn` form field to `tin` in that one request, so an ITIN typed into the
// SSN box is submitted as a taxpayer ID.
//
// The request is otherwise untouched and is sent only to Chase, exactly as
// the page would send it. Nothing is stored, logged, or sent anywhere else.
//
// Observed request (test data):
//   POST https://secure.chase.com/svc/wl/auth/public/v4/user/enrollment/form/list
//   Content-Type: application/x-www-form-urlencoded
//   accountNumber=TEST&ssn=111111111&enrollmentType=INDIVIDUAL

(() => {
  'use strict';

  const TARGET = /\/svc\/wl\/auth\/public\/v\d+\/user\/enrollment\/form\/list\/?$/;
  const LOG_PREFIX = '[ITIN Helper]';

  function isTarget(url) {
    try {
      return TARGET.test(new URL(String(url), location.href).pathname);
    } catch {
      return false;
    }
  }

  function renameParams(params, Ctor) {
    if (!params.has('ssn') || params.has('tin')) return params;
    const renamed = new Ctor();
    for (const [key, value] of params) renamed.append(key === 'ssn' ? 'tin' : key, value);
    return renamed;
  }

  // Renames the `ssn` field to `tin`. Leaves the body alone if there is no
  // `ssn` field or a `tin` field is already present.
  function rewriteBody(body) {
    if (typeof body === 'string') {
      if (/(?:^|&)tin=/.test(body)) return body;
      return body.replace(/(^|&)ssn=/, '$1tin=');
    }
    if (body instanceof URLSearchParams) return renameParams(body, URLSearchParams);
    if (body instanceof FormData) return renameParams(body, FormData);
    return body;
  }

  function rewriteAndLog(body) {
    const rewritten = rewriteBody(body);
    if (rewritten !== body) console.info(`${LOG_PREFIX} Submitting ITIN as "tin" instead of "ssn".`);
    return rewritten;
  }

  // --- fetch -----------------------------------------------------------------

  const nativeFetch = window.fetch;

  window.fetch = function fetch(input, init) {
    try {
      const url = input instanceof Request ? input.url : input;
      if (isTarget(url)) {
        if (init && 'body' in init) {
          init = { ...init, body: rewriteAndLog(init.body) };
        } else if (input instanceof Request && !input.bodyUsed) {
          const request = input;
          return request
            .clone()
            .text()
            .then((text) => nativeFetch.call(window, new Request(request, { body: rewriteAndLog(text) })));
        }
      }
    } catch (error) {
      console.warn(LOG_PREFIX, 'Could not rewrite request, sending it unchanged.', error);
    }
    return nativeFetch.call(window, input, init);
  };

  // --- XMLHttpRequest --------------------------------------------------------

  const xhrProto = XMLHttpRequest.prototype;
  const nativeOpen = xhrProto.open;
  const nativeSend = xhrProto.send;
  const targeted = new WeakSet();

  xhrProto.open = function open(method, url) {
    if (isTarget(url)) targeted.add(this);
    else targeted.delete(this);
    return nativeOpen.apply(this, arguments);
  };

  xhrProto.send = function send(body) {
    if (targeted.has(this)) {
      try {
        body = rewriteAndLog(body);
      } catch (error) {
        console.warn(LOG_PREFIX, 'Could not rewrite request, sending it unchanged.', error);
      }
    }
    return nativeSend.apply(this, arguments.length ? [body] : []);
  };
})();
