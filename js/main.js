const memoizer = new Map();

if (Modernizr && Modernizr.fetch && location.pathname === '/') {
  attachEventListeners(document.getElementsByClassName('workitem-link'));
  window.onpopstate = handlePopstateEvent;
}

function attachEventListeners(links) {
  for (let i = 0; i < links.length; i++) {
    const link = links[i];

    link.addEventListener('click', function(event) {
      event.preventDefault();

      history.pushState({href: link.href}, link.title, link.href);
      loadItem(link.href);
    });
  }
}

function handlePopstateEvent(event) {
  if (event.state == null || (event.state && event.state.href === '/')) {
    // Pass in false so that we don't push state on this close
    // and cannot go forward after this close. This way we'll
    // be able to go forward and get back the overlay we just closed.
    closeOverlay(null, false);
  }
  else {
    loadItem(event.state.href);
  }
}

function loadItem(url) {
  // Load the content from memory if possible
  // (skip HTTP request if we've fetched it before)
  if (memoizer.has(url)) {
    setOverlay(memoizer.get(url));
    return;
  }

  // Otherwise fetch the content over network
  fetchWorkItem(url, memoizer);
}

function fetchWorkItem(itemUrl, memoizer) {
  fetch(itemUrl).then(function(response) {
    if (!response.ok) throw 'Response error'

    return response.text();
  })
  .then(function(responseText) {
    // Create DOM in memory to be able to load the plaintext
    // response.text() string into a DOM to query it
    // (because we need to extract just the content to go in the overlay)
    const contentHolder = document.createElement('div');
    contentHolder.innerHTML = responseText;
    const itemContent = contentHolder.querySelector('#overlay-content').innerHTML;

    // Store the item content so that we don't have to fetch
    // it again over the network if user clicks this work item again
    memoizer.set(itemUrl, itemContent)
    setOverlay(itemContent);
  })
  .catch(function(error) {
    // Fallback on normal page load
    window.location.href = itemUrl;
  });
}

function setOverlay(content) {
  const body = document.getElementsByTagName('body')[0];
  const overlay = document.getElementById('workitem-overlay');
  const wrapper = document.getElementById('overlay-wrapper');
  const close = document.getElementById('workitem-overlay-close');
  const itemlinks = overlay.getElementsByClassName('workitem-link');

  overlay.innerHTML = content;
  wrapper.scrollTop = 0;
  body.classList.add('overlay-open');

  attachEventListeners(itemlinks);
  body.addEventListener('keyup', closeOverlayListener);
  close.addEventListener('click', closeOverlay);
  wrapper.addEventListener('click', closeOverlay);
  overlay.addEventListener('click', blockCloseClick);
}

function blockCloseClick(event) {
  // Make sure clicking on the overlay doesn't close it
  // because of propagation down to the wrapper
  event.stopPropagation();
}

function closeOverlay(event, pushState) {
  pushState = pushState == undefined ? true : pushState;
  const body = document.getElementsByTagName('body')[0];
  const overlay = document.getElementById('workitem-overlay');
  const close = document.getElementById('workitem-overlay-close');
  const wrapper = document.getElementById('overlay-wrapper');

  overlay.innerHTML = '';
  body.classList.remove('overlay-open');

  body.removeEventListener('keyup', closeOverlayListener);
  close.removeEventListener('click', closeOverlay);
  wrapper.removeEventListener('click', closeOverlay);
  overlay.removeEventListener('click', blockCloseClick);

  // Boolean check here is because we do not
  // want to push state if we are coming back to /,
  // so we pass in false in the popstate on /.
  if (pushState) {
    history.pushState({href: '/'}, 'Home', '/');
  }
}

function closeOverlayListener(event) {
  if (event.keyCode === 27) closeOverlay();
}
