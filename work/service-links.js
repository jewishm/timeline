(() => {

  "use strict";


  const SERVICE_MAP = [

    {
      key: "spotify",
      label: "Spotify",
      match:
        url =>
          url.includes(
            "spotify.com"
          )
    },

    {
      key: "apple",
      label: "Apple Music",
      match:
        url =>
          url.includes(
            "music.apple.com"
          )
          ||
          url.includes(
            "itunes.apple.com"
          )
    },

    {
      key: "deezer",
      label: "Deezer",
      match:
        url =>
          url.includes(
            "deezer.com"
          )
    },

    {
      key: "tidal",
      label: "TIDAL",
      match:
        url =>
          url.includes(
            "tidal.com"
          )
    },

    {
      key: "qobuz",
      label: "Qobuz",
      match:
        url =>
          url.includes(
            "qobuz.com"
          )
    },

    {
      key: "amazonmusic",
      label: "Amazon Music",
      match:
        url =>
          url.includes(
            "music.amazon."
          )
    },

    {
      key: "amazon",
      label: "Amazon",
      match:
        url =>
          /amazon\.(com|de|co\.uk)/
            .test(
              url
            )
    },

    {
      key: "youtubemusic",
      label: "YouTube Music",
      match:
        url =>
          url.includes(
            "music.youtube.com"
          )
    },

    {
      key: "youtube",
      label: "YouTube",
      match:
        url =>
          url.includes(
            "youtube.com"
          )
          ||
          url.includes(
            "youtu.be"
          )
    },

    {
      key: "boomplay",
      label: "Boomplay",
      match:
        url =>
          url.includes(
            "boomplay.com"
          )
    },

    {
      key: "soundcloud",
      label: "SoundCloud",
      match:
        url =>
          url.includes(
            "soundcloud.com"
          )
    },

    {
      key: "anghami",
      label: "Anghami",
      match:
        url =>
          url.includes(
            "anghami.com"
          )
    },

    {
      key: "bandcamp",
      label: "Bandcamp",
      match:
        url =>
          url.includes(
            "bandcamp.com"
          )
    },

    {
      key: "beatport",
      label: "Beatport",
      match:
        url =>
          url.includes(
            "beatport.com"
          )
    },

    {
      key: "audiomack",
      label: "Audiomack",
      match:
        url =>
          url.includes(
            "audiomack.com"
          )
    }

  ];


  function escapeHtml(
    value
  ) {

    return String(
      value ?? ""
    )
      .replaceAll(
        "&",
        "&amp;"
      )
      .replaceAll(
        "<",
        "&lt;"
      )
      .replaceAll(
        ">",
        "&gt;"
      )
      .replaceAll(
        '"',
        "&quot;"
      );
  }


  function externalUrl(
    anchor
  ) {

    const href =
      anchor.getAttribute(
        "href"
      );

    if (!href) {
      return null;
    }


    try {

      const url =
        new URL(
          href,
          location.href
        );


      if (
        url.origin
        === location.origin
      ) {
        return null;
      }


      return url.href
        .toLowerCase();

    }
    catch {

      return null;
    }
  }


  function knownService(
    url
  ) {

    return SERVICE_MAP.find(
      service =>
        service.match(
          url
        )
    ) || null;
  }


  function originalText(
    anchor
  ) {

    return (
      anchor.getAttribute(
        "aria-label"
      )
      ||
      anchor.getAttribute(
        "title"
      )
      ||
      anchor.textContent
      ||
      ""
    )
      .replace(
        /\s+/g,
        " "
      )
      .trim();
  }


  function actionKind(
    anchor
  ) {

    const text =
      originalText(
        anchor
      )
        .toLowerCase();


    if (
      text.includes(
        "download"
      )
    ) {
      return "download";
    }


    if (
      text.includes(
        "buy"
      )
      ||
      text.includes(
        "purchase"
      )
      ||
      text.includes(
        "store"
      )
    ) {
      return "buy";
    }


    return "listen";
  }


  function genericIcon(
    kind
  ) {

    if (
      kind === "buy"
    ) {

      return `
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true">

          <path
            d="
              M6.5 8.5h11
              l1 11h-13
              l1-11z
            "
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linejoin="round">
          </path>

          <path
            d="
              M9 9
              V7
              a3 3 0 0 1 6 0
              v2
            "
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round">
          </path>

        </svg>
      `;
    }


    if (
      kind === "download"
    ) {

      return `
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true">

          <path
            d="
              M12 4v10
              M8 10l4 4 4-4
              M5 19h14
            "
            fill="none"
            stroke="currentColor"
            stroke-width="1.9"
            stroke-linecap="round"
            stroke-linejoin="round">
          </path>

        </svg>
      `;
    }


    return `
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true">

        <path
          d="
            M5 13v-2
            a7 7 0 0 1 14 0
            v2
          "
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round">
        </path>

        <rect
          x="4"
          y="12"
          width="4"
          height="7"
          rx="2"
          fill="currentColor">
        </rect>

        <rect
          x="16"
          y="12"
          width="4"
          height="7"
          rx="2"
          fill="currentColor">
        </rect>

      </svg>
    `;
  }


  function processAnchor(
    anchor
  ) {

    if (
      anchor.dataset
        .jmtServiceReady
    ) {
      return;
    }


    const url =
      externalUrl(
        anchor
      );


    if (!url) {
      return;
    }


    /*
     * Only convert actual music/store
     * actions, not arbitrary external
     * links such as MusicBrainz edits.
     */

    const isAction =
      anchor.matches(
        [
          ".service-button",
          ".dialog-action",
          ".version-button.service-icon"
        ].join(",")
      );


    if (!isAction) {
      return;
    }


    const service =
      knownService(
        url
      );

    const kind =
      actionKind(
        anchor
      );


    const oldText =
      originalText(
        anchor
      );


    let label =
      oldText;


    if (
      service
      && (
        !label
        ||
        label.toLowerCase()
          .includes(
            "listen"
          )
        ||
        label.toLowerCase()
          .includes(
            "buy"
          )
        ||
        label.toLowerCase()
          .includes(
            "download"
          )
      )
    ) {
      label =
        service.label;
    }


    if (!label) {

      label =
        kind === "buy"
          ? "Purchase"
          : kind === "download"
            ? "Download"
            : "Listen";
    }


    anchor.dataset
      .jmtServiceReady =
        "1";


    anchor.classList.add(
      "jmt-service-link"
    );


    anchor.classList.add(
      "jmt-service-"
      + (
        service
          ? service.key
          : kind
      )
    );


    anchor.setAttribute(
      "aria-label",
      label
    );


    anchor.setAttribute(
      "title",
      label
    );


    if (service) {

      anchor.innerHTML = `
        <img
          class="jmt-service-logo"
          src="/work/icons/${escapeHtml(
            service.key
          )}.png"
          alt=""
          aria-hidden="true">
      `;

    }
    else {

      anchor.innerHTML =
        genericIcon(
          kind
        );
    }
  }


  function scan(
    root = document
  ) {

    if (
      root instanceof
      Element
      &&
      root.matches(
        "a"
      )
    ) {
      processAnchor(
        root
      );
    }


    if (
      root.querySelectorAll
    ) {

      root.querySelectorAll(
        "a"
      )
        .forEach(
          processAnchor
        );
    }
  }


  scan();


  const observer =
    new MutationObserver(
      mutations => {

        for (
          const mutation
          of mutations
        ) {

          for (
            const node
            of mutation.addedNodes
          ) {

            if (
              node.nodeType
              === 1
            ) {

              scan(
                node
              );
            }
          }
        }
      }
    );


  observer.observe(
    document.documentElement,
    {
      childList: true,
      subtree: true
    }
  );

})();
