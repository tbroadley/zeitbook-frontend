# Service worker

A service worker is a piece of JavaScript code that your browser runs in the background. It provides features such as push notifications, background data synchronization, and resource and request caching. Since it is a [JavaScript Worker](https://www.html5rocks.com/en/tutorials/workers/basics/), it doesn't have access to the DOM. However, it can interact with the DOM indirectly by communicating with your application's main thread. In this step, you'll create a service worker that caches static resources upon which your application depends, as well as API requests made by your application.

> Service workers are supported by Chrome (for desktop and mobile devices), Firefox, and Opera. They're also available in Edge and Safari behind a feature flag. They aren't supported in Internet Explorer.

## Create a service worker to cache your application's resources

Add the following code to `assets/service-worker.js`:

```javascript
importScripts('./scripts/environment.js');
const { API_ROOT, FIREBASE_CREDENTIALS: { messagingSenderId } } = env;

const CACHE_NAME = 'zeitbook-cache-v1';
const urlsToCache = [
  '/',
  '/index.js',
  '/index.css',
  '/post.js',
  '/icons/192x192.png',
  '/icons/256x256.png',
  '/icons/512x512.png',
  '/images/back-arrow.png',
  '/images/up-arrow.png',
  '/images/zeitspace-logo.png',
  '/scripts/util.js',
];

self.addEventListener('install', (event) => {
  const addUrlsToCache = caches.open(CACHE_NAME)
    .then(cache => cache.addAll(urlsToCache));
  event.waitUntil(addUrlsToCache);
});
```

> `CACHE_NAME` specifies a name and version for the service worker's cache. In a production setting, you should change the cache version every time you modify any of the resources cached by the service worker.
>
> During development, you can set up Chrome DevTools to reload your application's service worker every time you refresh the page, so that you don't need to update the cache version every time you change a file. To do so, open Chrome DevTools (`F12` on Windows or `cmd + option + j` on macOS). In the Application tab of the DevTools, click on the Service Workers menu item and check the "Update on reload" checkbox.
>
> `urlsToCache` is a list of static resources that the service worker should cache. When it receives an `install` event, the service worker downloads all the listed resources, then stores them in its cache.

## Register your service worker

Your application must register its service worker with the browser. To do so, replace the contents of `src/service-worker.js` with the following:

```javascript
export default navigator.serviceWorker.register('/service-worker.js');
```

## Set up your service worker to cache your application's HTML pages

This will allow you to load the HTML for the pages displaying all posts (`localhost:3000/`) and a single post (e.g. `localhost:3000/posts/abcde`) even when you're offline.

Add the following code to the **bottom** of `assets/service-worker.js`:

```javascript
function fetchAndCache(request, cache) {
  return fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    });
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method === 'GET') { // During the next step, replace `if` with `} else if`
    const cacheFirst = caches.open(CACHE_NAME)
      .then(cache => cache.match(request)
        .then((response) => {
          if (response) {
            return response;
          }
          return fetchAndCache(request, cache);
        }));
    event.respondWith(cacheFirst);
  }
});
```

> This code uses a `fetch` event listener to act as an intermediary between your application and the network. Whenever your application loads a resource, this event listener is called and the service worker has the opportunity to load a cached response instead of making a network request.
>
> The event listener first checks if the requested resource exists in the cache. If the resource doesn't exist, it makes a network request for the resource. This strategy of "cache, falling back to network" is the most common strategy for most applications.
>
> The event listener uses the `fetchAndCache` function to request resources over the network. This function first makes a network request for the resource, then saves it in the cache so that it can be loaded more quickly later.
>
> Note that the listener only tries to load GET requests from the cache. This is because the Cache API only supports caching GET requests.

## Set up your service worker to cache API requests

Add the following code inside your service worker's `fetch` event listener. It should be placed **after the first line of the function** (`const { request } = event;`). Also, in the line `if (request.method === 'GET') {`, replace `if` with `} else if`.

```javascript
  if (request.method === 'GET' && request.url.includes(API_ROOT)) {
    const networkFirst = caches.open(CACHE_NAME)
      .then(cache => fetchAndCache(request, cache)
        .catch(error => cache.match(request)
          .then((response) => {
            if (response) {
              return response;
            }
            throw error;
          })));
    event.respondWith(networkFirst);
  } else if (request.method === 'GET') { // Replaced `if` with `} else if`
    // ...
  }
```

Your `fetch` event listener should now contain:

```javascript
  if (request.method === 'GET' && request.url.includes(API_ROOT)) {
    const networkFirst = caches.open(CACHE_NAME)
      .then(cache => fetchAndCache(request, cache)
        .catch(error => cache.match(request)
          .then((response) => {
            if (response) {
              return response;
            }
            throw error;
          })));
    event.respondWith(networkFirst);
  } else if (request.method === 'GET') {
    const cacheFirst = caches.open(CACHE_NAME)
      .then(cache => cache.match(request)
        .then((response) => {
          if (response) {
            return response;
          }
          return fetchAndCache(request, cache);
        }));
    event.respondWith(cacheFirst);
  }
```

> The "cache, falling back to network" strategy outlined above doesn't work well for requests to the Zeitbook API. If your device is connected to the Internet, your application should always load the latest posts and comments from the API, instead of loading stale data from the cache. Your application should only load data from the cache when you are offline. We'll refer to this strategy, which you've just implemented for Zeitbook API requests, as "network, falling back to cache".
>
> If the request is made to the Zeitbook API, the listener first tries to load fresh data using `fetchAndCache`. If this fails, it attempts to load potentially stale data from the cache.

## Check that your service worker installs correctly

Open the Google Chrome tab containing your application. In Chrome DevTools, under the Application tab, click on "Service Workers" to check that your service worker has been installed correctly:

![](screenshots/02-service-worker/01-service-worker.png)

You can also click on "Cache Storage" to view the contents of your service worker's cache:

![](screenshots/02-service-worker/02-cache-storage.png)

## Test your application's offline capabilities

Disconnect your computer from the Internet and try reloading your application. Despite being offline, the page will still load using cached resources and API responses.

## Run Lighthouse

Try running the Lighthouse Progressive Web App audits again. You can run Lighthouse in Chrome DevTools under the Audits tab.

Your application should now pass all Progressive Web App audits except for "Redirects HTTP traffic to HTTPS". Congratulations!

![](screenshots/02-service-worker/03-lighthouse.png)

## Next step

[Add push notifications to your application.](./03-push-notifications.md)
