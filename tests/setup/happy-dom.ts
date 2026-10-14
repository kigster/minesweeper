import { GlobalRegistrator } from '@happy-dom/global-registrator';

// Gives every test file a browser-like `document` and `window`.
if (!GlobalRegistrator.isRegistered) {
  GlobalRegistrator.register({ url: 'http://localhost:3000/' });
}
