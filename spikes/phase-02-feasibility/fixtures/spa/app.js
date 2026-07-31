(() => {
  "use strict";

  const routeView = document.querySelector("#route-view");
  const catalogStatus = document.querySelector("#catalog-status");
  const delayedComponent = document.querySelector("#delayed-component");
  const lazyTarget = document.querySelector("#lazy-target");
  let catalog = [];

  const routeMarkup = (pathname) => {
    if (pathname === "/products/example-item") {
      document.title = "Example Item — Phase 2 Fixture";
      return `
        <article data-archive-state="ready">
          <p class="eyebrow">Products / Example Item</p>
          <h2>Example Item archived state</h2>
          <p>This route was rendered after a History API transition.</p>
          <p data-product-count="${catalog.length}">Catalog items available: ${catalog.length}</p>
        </article>`;
    }
    if (pathname === "/products") {
      document.title = "Products — Phase 2 Fixture";
      return `
        <section>
          <p class="eyebrow">Products</p>
          <h2>Deterministic catalog</h2>
          <ul>${catalog
            .map(
              (item) =>
                `<li><a href="/products/${item.id}" data-route="/products/${item.id}">${item.name}</a></li>`,
            )
            .join("")}</ul>
        </section>`;
    }
    document.title = "Phase 2 Fixture";
    return `
      <section>
        <p class="eyebrow">Home</p>
        <h2>JavaScript-rendered home</h2>
        <p>The initial response did not contain this rendered route content.</p>
      </section>`;
  };

  const renderRoute = () => {
    document.body.dataset.renderState = "loading";
    routeView.innerHTML = routeMarkup(window.location.pathname);
    window.setTimeout(() => {
      delayedComponent.textContent = "Delayed component ready";
      document.body.dataset.renderState = "complete";
      routeView.focus();
    }, 120);
  };

  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[data-route]");
    if (!link) return;
    event.preventDefault();
    history.pushState({ fixtureRoute: link.dataset.route }, "", link.href);
    renderRoute();
  });
  window.addEventListener("popstate", renderRoute);

  const lazyObserver = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting) || lazyTarget.children.length > 0) {
      return;
    }
    window.setTimeout(() => {
      const image = document.createElement("img");
      image.id = "lazy-image";
      image.src = "/lazy.svg";
      image.alt = "Deterministic lazy-loaded archive proof";
      image.addEventListener("load", () => {
        image.dataset.loaded = "true";
        document.body.dataset.lazyState = "loaded";
      });
      lazyTarget.append(image);
      lazyObserver.disconnect();
    }, 100);
  });
  lazyObserver.observe(document.querySelector("#lazy-zone"));

  fetch("/api/catalog")
    .then((response) => {
      if (!response.ok) throw new Error("Catalog response failed");
      return response.json();
    })
    .then((payload) => {
      catalog = payload.items;
      catalogStatus.textContent = `Catalog loaded: ${catalog.length} items`;
      renderRoute();
    })
    .catch(() => {
      catalogStatus.textContent = "Catalog failed";
      document.body.dataset.renderState = "failed";
    });
})();

