# On-device example

A minimal Expo app that runs the detector against **@tanstack/react-query v5**
on a real device/simulator, and renders every waterfall it reports on screen.
The library is consumed through `file:..`, i.e. the built `dist/` of this repo.

The app taps `console.warn`, keeps the lines the detector actually emits, and
lists them: nothing on screen is synthesised.

## Run it

```bash
yarn build          # at the repo root, the example consumes dist/
cd example
npm install
npx expo start --ios   # or --android; Expo Go is enough, the library is pure JS
```

- **Run 2 SEQUENTIAL queries** starts `["user", n]`, waits for it to resolve,
  then starts `["posts-of-user", n]`. One waterfall appears in the list.
- **Run 2 PARALLEL queries** starts `["profile", n]` and `["settings", n]` at
  once. The list does not grow.
