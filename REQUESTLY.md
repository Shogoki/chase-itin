# The original approach: Requestly

This extension automates a manual workaround documented by **Bbjoe555** on RedFlagDeals in [*Chase Account Setup with ITIN*](https://docs.google.com/document/u/0/d/e/2PACX-1vQSjogADeDop3WCkfjH7_pXXfakFn48jiF1Ed5uFVavuc0iprma8vdblTStrLcbLfgvq0E4U9v9UM1h/pub). If you'd rather not install this extension, or want to understand exactly what it does, you can do the same thing yourself with [Requestly](https://requestly.com), a general-purpose tool for modifying browser requests.

## The problem

People living outside the US (e.g. in Canada) can open a Chase account using an ITIN, but enrolling in online banking fails. Both the web and mobile enrollment forms require an SSN. Phone support often can't help, and visiting a US branch isn't always possible.

## The idea

The enrollment form sends this request:

```
POST https://secure.chase.com/svc/wl/auth/public/v4/user/enrollment/form/list
Content-Type: application/x-www-form-urlencoded

accountNumber=…&ssn=…&enrollmentType=INDIVIDUAL
```

Chase's backend also accepts a `tin` field in place of `ssn`. The form just never sends it. If you intercept the request in your own browser and rename `ssn` to `tin`, you can type your ITIN into the SSN box and the enrollment goes through. Nothing is sent anywhere except Chase.

## What you need

- Google Chrome
- The [Requestly](https://requestly.com) Chrome extension (free account)

## Steps

1. Open Requestly at <https://app.requestly.io/home>.
2. Click **Create new Rule**.
3. Choose **Modify Request Body**, then click **Create Rule**.
4. In the request URL field, enter:
   ```
   svc/wl/auth/public/v4/user/enrollment/form/list
   ```
5. Select **Programmatic (JavaScript)**.
6. Replace the code in the box with:
   ```js
   function modifyRequestBody(args) {
     const { method, url, body, bodyAsJson } = args;
     // Change request body below depending upon request attributes received in args

     return body.replace('ssn', 'tin');
   }
   ```
7. Click **Save rule**.
8. Go to [chase.com](https://www.chase.com) and enroll in online banking normally, **typing your ITIN into the SSN field**.
9. If enrollment continues, you're done. If not, see troubleshooting below.

> **Note on the snippet:** `body.replace('ssn', 'tin')` replaces the *first* `ssn` anywhere in the body, not specifically the field name. That works for the current request because `accountNumber` comes first and the account number is digits only. A stricter version that only renames the field is:
>
> ```js
> return body.replace(/(^|&)ssn=/, '$1tin=');
> ```
>
> This is what the extension does.

## Troubleshooting

1. In Requestly, paste the enrollment URL into the rule's test box and click **Test Rule**:
   ```
   https://secure.chase.com/web/auth/enrollment#/enroll/onlineEnrollment/gettingStarted/index?LOB=
   ```
2. The enrollment page opens. Requestly's widget (top right) should say the rule hasn't been applied yet.
3. Open Chrome DevTools (<kbd>Cmd</kbd>+<kbd>Option</kbd>+<kbd>J</kbd> on Mac, <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>J</kbd> on Windows/Linux) and switch to the **Network** tab.
4. Fill in the sign-up fields and submit. Requestly should now show **✅ Rule applied**.
5. Click the `list` request in the Network tab and check its payload. It should contain `tin` instead of `ssn`.
6. If it shows `tin` but enrollment still fails, your account number or ITIN likely doesn't match Chase's records. Double-check them.

The original guide also notes you may need a US phone number that can receive SMS for verification.

## Requestly vs. this extension

|                         | Requestly                           | This extension                        |
| ----------------------- | ----------------------------------- | ------------------------------------- |
| Setup                   | Account + create and configure rule | Load the extension, nothing else      |
| Permissions             | All sites (general-purpose tool)    | `secure.chase.com` only               |
| Code you have to trust  | A large third-party extension       | ~100 lines in [`src/inject.js`](src/inject.js) |
| What gets rewritten     | First `ssn` substring in the body   | Only the `ssn` form field             |
