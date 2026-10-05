# ITIN Enrollment Helper for Chase

A tiny Chrome extension for people who have a Chase account tied to an **ITIN** (Individual Taxpayer Identification Number) and can't sign up for online banking because Chase's enrollment form only accepts an **SSN**.

Install it, go to chase.com, and enroll as normal, typing your ITIN into the SSN field. There's nothing to configure.

> Prefer not to install an extension? [REQUESTLY.md](REQUESTLY.md) explains the original manual approach this extension automates.

## Install

The extension is not on the Chrome Web Store (yet), so install it manually:

1. Download this repository: **Code → Download ZIP**, then unzip it (or `git clone` it).
2. Open `chrome://extensions` in Chrome (or any Chromium browser: Edge, Brave, Arc, …).
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and select the unzipped folder (the one containing `manifest.json`).

You'll see "ITIN Enrollment Helper for Chase" in your extensions list. Requires Chrome 111 or newer.

## Use

1. Go to [chase.com](https://www.chase.com) and start **Sign up / Enroll** for online banking. The direct link is
   `https://secure.chase.com/web/auth/enrollment#/enroll/onlineEnrollment/gettingStarted/index?LOB=`
2. Enter your account number and type your **ITIN into the SSN field**.
3. Continue the enrollment as usual.

Once you're enrolled you can remove the extension. It's only needed for this one step.

## How it works

Chase's enrollment page sends your details to:

```
POST https://secure.chase.com/svc/wl/auth/public/v4/user/enrollment/form/list
Content-Type: application/x-www-form-urlencoded

accountNumber=…&ssn=…&enrollmentType=INDIVIDUAL
```

The form only offers an SSN field, but the endpoint also accepts a `tin` (taxpayer ID) field. The extension renames `ssn=` to `tin=` in **this one request** and changes nothing else:

```
accountNumber=…&tin=…&enrollmentType=INDIVIDUAL
```

The entire extension is [`src/inject.js`](src/inject.js) (about 100 lines) plus [`manifest.json`](manifest.json). It runs only on `https://secure.chase.com/*`. It wraps the page's `fetch` and `XMLHttpRequest` so it can rename the field before the request is sent. Every other request goes through untouched.

## Check that it's working

1. Open DevTools on the enrollment page (<kbd>Cmd</kbd>+<kbd>Option</kbd>+<kbd>J</kbd> on Mac, <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>J</kbd> on Windows/Linux).
2. Submit the account number / ITIN step.
3. The **Console** should show `[ITIN Helper] Submitting ITIN as "tin" instead of "ssn".`
4. In the **Network** tab, click the `list` request and open **Payload**. It should show `tin`, not `ssn`.

## Troubleshooting

- **No console message:** make sure the extension is enabled in `chrome://extensions`, then reload the Chase page. The extension has to load before the page does.
- **Payload shows `tin` but enrollment still fails:** the account number or ITIN probably doesn't match Chase's records. Double-check both.
- **Request URL is different from the one above:** Chase may have changed their site. Please open an issue.
- You may need a US phone number that can receive SMS for the verification code.

## Privacy

- The extension collects, stores, and transmits **nothing**. It has no background script, no analytics, and makes no network requests of its own.
- Your data goes only to Chase, in the same request the page would send anyway, with one field renamed.
- It runs only on `secure.chase.com` and requests no other permissions.

## Development

The rewrite logic is tested in a real browser, with `fetch` and `XMLHttpRequest` stubbed so nothing hits the network:

```sh
python3 -m http.server 8765
# open http://localhost:8765/test/harness.html — the page title shows "ALL PASS"
```

## Credits

The technique was found and documented by **Bbjoe555** on [RedFlagDeals](https://forums.redflagdeals.com/) in the guide [*Chase Account Setup with ITIN*](https://docs.google.com/document/u/0/d/e/2PACX-1vQSjogADeDop3WCkfjH7_pXXfakFn48jiF1Ed5uFVavuc0iprma8vdblTStrLcbLfgvq0E4U9v9UM1h/pub). This extension packages that approach so no setup is needed.

## Disclaimer

This is an unofficial community tool. It is not affiliated with, endorsed by, or supported by JPMorgan Chase & Co. "Chase" is a trademark of its owner and is used here only to describe what the extension works with. Use at your own risk. Chase can change their site at any time, which may stop the extension from working.
