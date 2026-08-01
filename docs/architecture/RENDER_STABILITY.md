# Render Stability

**DOM stability model:** 1  
**Network stability model:** 1

A Render is stable only when all applicable conditions hold in the same polling observation:

- the optional completion selector matches;
- no observed DOM mutation has occurred for the configured DOM quiet window;
- no tracked finite request remains active; and
- no finite-network activity has occurred for the configured network quiet window.

Defaults are 500 ms DOM quiet, 500 ms network quiet, and 50 ms polling within the 12-second stability bound. A `MutationObserver` watches subtree child, attribute, and character-data changes. Continuous mutation therefore reaches `RENDER_STABILITY_TIMEOUT`. An invalid selector fails through the bounded structured Render error boundary.

HTTP requests are tracked from request start through finish/failure. WebSocket and EventSource requests are treated as long-lived and do not remain in the active finite-request set; their initial activity is still observed. Polling remains bounded by stability/Render deadlines. This deliberately avoids Playwright `networkidle`, which is not used as a correctness claim.
