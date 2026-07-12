# VERAKAI Mobile Prototype

Front-end React and Tailwind prototype for testing the VERAKAI core journey:

`Onboarding → Builder Goal → Suggested Promises → Dashboard → Focus Session → Evidence → Journey`

## Run locally

```bash
python3 -m http.server 4173
```

Open `http://localhost:4173`.

## Test

```bash
node prototype.test.cjs
```

The prototype stores state in the browser with `localStorage`. It does not yet include authentication, a database, or server-side APIs.
