(() => {
  "use strict";

  const cache = new Map();


  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }


  function formatDuration(ms) {

    if (
      ms === null
      || ms === undefined
      || !Number.isFinite(
        Number(ms)
      )
    ) {
      return "";
    }


    const seconds =
      Math.round(
        Number(ms) / 1000
      );

    const minutes =
      Math.floor(
        seconds / 60
      );


    return (
      `${minutes}:`
      + String(
          seconds % 60
        ).padStart(
          2,
          "0"
        )
    );
  }


  function extractMbid(info) {

    const link =
      info.querySelector(
        '.mb-link a[href*="/release-group/"]'
      );


    if (!link) {
      return null;
    }


    const match =
      String(
        link.href
      ).match(
        /\/release-group\/([0-9a-f-]{36})/i
      );


    return match
      ? match[1].toLowerCase()
      : null;
  }


  function tracklistUrl(mbid) {

    return (
      "/data/tracklists/"
      + mbid.slice(0, 2)
      + "/"
      + mbid
      + ".json"
    );
  }


  async function getTracklist(mbid) {

    if (cache.has(mbid)) {
      return cache.get(mbid);
    }


    const promise =
      fetch(
        tracklistUrl(mbid)
      )
      .then(response => {

        if (!response.ok) {
          throw new Error(
            `Tracklist HTTP ${response.status}`
          );
        }

        return response.json();
      });


    cache.set(
      mbid,
      promise
    );


    return promise;
  }


  function trackTitleHtml(track) {

    const title =
      escapeHtml(
        track.title
      );

    const works =
      Array.isArray(
        track.works
      )
        ? track.works.filter(
            work =>
              work
              && work.mbid
          )
        : [];


    if (!works.length) {
      return title;
    }


    if (works.length === 1) {

      return `
        <a
          class="tl-work-link"
          href="/work/?id=${encodeURIComponent(
            works[0].mbid
          )}"
          title="View all recorded versions">
          ${title}
        </a>
      `;
    }


    return `
      <span>
        ${title}
      </span>

      <span class="tl-work-list">
        ${
          works
            .map(
              work => `
                <a
                  class="tl-work-link"
                  href="/work/?id=${encodeURIComponent(
                    work.mbid
                  )}">
                  ${
                    escapeHtml(
                      work.title
                      || "Work"
                    )
                  }
                </a>
              `
            )
            .join(" · ")
        }
      </span>
    `;
  }


  function mediumHtml(
    medium,
    mediaCount
  ) {

    const heading =
      mediaCount > 1
        ? `
            <div class="tl-disc-heading">

              <strong>
                ${
                  escapeHtml(
                    medium.title
                    || `Disc ${medium.position}`
                  )
                }
              </strong>

              ${
                medium.format
                  ? `
                      <span>
                        ${
                          escapeHtml(
                            medium.format
                          )
                        }
                      </span>
                    `
                  : ""
              }

            </div>
          `
        : "";


    const tracks =
      (medium.tracks || [])
        .map(
          track => `
            <div class="tl-track">

              <span class="tl-number">
                ${
                  escapeHtml(
                    track.position
                  )
                }
              </span>

              <span
                class="tl-title"
                dir="auto">
                ${
                  trackTitleHtml(
                    track
                  )
                }
              </span>

              <span class="tl-duration">
                ${
                  escapeHtml(
                    formatDuration(
                      track.length_ms
                    )
                  )
                }
              </span>

            </div>
          `
        )
        .join("");


    return `
      <div class="tl-medium">
        ${heading}
        ${tracks}
      </div>
    `;
  }


  function makePanel(data) {

    const details =
      document.createElement(
        "details"
      );

    details.className =
      "tracklist-panel";


    const media =
      data.media || [];

    const source =
      data.source_release || {};


    details.innerHTML = `
      <summary>

        <span class="tl-summary-title">
          Tracklist
        </span>

        <span class="tl-summary-meta">
          ${
            escapeHtml(
              data.track_count || 0
            )
          }
          ${
            Number(
              data.track_count || 0
            ) === 1
              ? "track"
              : "tracks"
          }
        </span>

        <span
          class="tl-chevron"
          aria-hidden="true">
          ›
        </span>

      </summary>

      <div class="tracklist-content">

        ${
          media
            .map(
              item =>
                mediumHtml(
                  item,
                  media.length
                )
            )
            .join("")
        }

        ${
          source.musicbrainz_url
            ? `
                <div class="tl-source">

                  <a
                    href="${
                      escapeHtml(
                        source.musicbrainz_url
                      )
                    }"
                    target="_blank"
                    rel="noopener">
                    Tracklist on MusicBrainz ↗
                  </a>

                </div>
              `
            : ""
        }

      </div>
    `;


    return details;
  }


  async function enhanceInfo(info) {

    if (!info) {
      return;
    }


    if (
      info.querySelector(
        ".tracklist-panel"
      )
    ) {
      return;
    }


    if (
      info.dataset.tracklistState
    ) {
      return;
    }


    const mbid =
      extractMbid(info);


    if (!mbid) {
      return;
    }


    info.dataset.tracklistState =
      "loading";


    try {

      const data =
        await getTracklist(
          mbid
        );


      /*
       * Dialog content can change while
       * the network request is in flight.
       */
      if (
        extractMbid(info)
        !== mbid
      ) {
        return;
      }


      const panel =
        makePanel(
          data
        );


      const mbLink =
        info.querySelector(
          ".mb-link"
        );


      if (mbLink) {

        info.insertBefore(
          panel,
          mbLink
        );

      }
      else {

        info.appendChild(
          panel
        );

      }


      info.dataset.tracklistState =
        "loaded";

    }
    catch (error) {

      console.warn(
        "Tracklist unavailable:",
        error
      );

      info.dataset.tracklistState =
        "missing";

    }
  }


  function scan() {

    document
      .querySelectorAll(
        "dialog[open] .dialog-info"
      )
      .forEach(
        enhanceInfo
      );


    const standalone =
      document.querySelector(
        ".standalone-info"
      );


    if (standalone) {
      enhanceInfo(
        standalone
      );
    }
  }


  const observer =
    new MutationObserver(
      scan
    );


  observer.observe(
    document.documentElement,
    {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        "open"
      ],
    }
  );


  document.addEventListener(
    "click",
    () => {
      requestAnimationFrame(
        scan
      );
    },
    true
  );


  scan();

})();
