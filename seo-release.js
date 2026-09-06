(() => {
  "use strict";


  const STATIC_RELEASE =
    /^\/release\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/?$/i;


  if (
    !STATIC_RELEASE.test(
      location.pathname
    )
  ) {
    return;
  }


  const main =
    document.querySelector(
      "main"
    );


  if (!main) {
    return;
  }


  document.documentElement
    .classList.add(
      "jmt-static-release"
    );


  const card =
    main.querySelector(
      ".seo-card"
    );


  if (card) {
    card.classList.add(
      "seo-release-card-enhanced"
    );
  }


  /*
   * Extra protection for pages generated before
   * the new build. New builds no longer emit these.
   */
  main.querySelectorAll(
    "details.seo-aliases"
  ).forEach(
    element =>
      element.remove()
  );


  /*
   * Turn the long raw SEO track list into the
   * same compact interaction visitors expect
   * elsewhere on JMT.
   *
   * The actual tracks remain in the HTML.
   */
  const trackList =
    main.querySelector(
      "ol.seo-tracklist"
    );


  if (
    !trackList
    || trackList.closest(
      ".seo-static-trackbox"
    )
  ) {
    return;
  }


  const trackHeading =
    [
      ...main.querySelectorAll(
        "h2"
      )
    ].find(
      element =>
        /^track\s*list$/i.test(
          (
            element.textContent
            || ""
          ).trim()
        )
    );


  const count =
    trackList.querySelectorAll(
      ":scope > li"
    ).length;


  const details =
    document.createElement(
      "details"
    );


  details.className =
    "seo-static-trackbox";


  const summary =
    document.createElement(
      "summary"
    );


  const label =
    document.createElement(
      "span"
    );


  label.className =
    "seo-static-track-label";

  label.textContent =
    "Tracklist";


  const meta =
    document.createElement(
      "span"
    );


  meta.className =
    "seo-static-track-count";

  meta.textContent =
    (
      `${count} `
      + (
        count === 1
          ? "track"
          : "tracks"
      )
    );


  summary.append(
    label,
    meta
  );


  details.append(
    summary,
    trackList
  );


  if (trackHeading) {

    trackHeading.replaceWith(
      details
    );
  }
  else {

    trackList.replaceWith(
      details
    );

    details.append(
      trackList
    );
  }


  /*
   * Make the MusicBrainz link look like an action
   * rather than an underlined paragraph.
   */
  const mbLink =
    [
      ...main.querySelectorAll(
        'a[href*="musicbrainz.org/"]'
      )
    ].find(
      link =>
        /view on musicbrainz/i.test(
          link.textContent || ""
        )
    );


  if (mbLink) {

    mbLink.classList.add(
      "seo-release-mb-link"
    );
  }

})();
