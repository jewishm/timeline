const $ = id =>
  document.getElementById(id);


const artistName =
  $("artistName");

const artistStats =
  $("artistStats");

const shareArtist =
  $("shareArtist");

const sectionsRoot =
  $("discographySections");

const emptyState =
  $("emptyState");

const dialog =
  $("releaseDialog");

const dialogContent =
  $("dialogContent");

const dialogShare =
  $("dialogShare");

let currentSharedRelease =
  null;

const dialogClose =
  $("dialogClose");


const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];


const SECTION_ORDER = [
  ["albums", "Albums"],
  ["live_albums", "Live Albums"],
  ["compilations", "Compilations"],

  [
    "spoken_word",
    "Spoken Word & Stories"
  ],

  [
    "mix_albums",
    "Mixes & Remixes"
  ],

  ["soundtracks", "Soundtracks"],
  ["other_albums", "Other Albums"],

  ["eps", "EPs"],
  ["live_eps", "Live EPs"],
  ["other_eps", "Other EPs"],

  ["singles", "Singles"],
  ["live_singles", "Live Singles"],

  [
    "mix_singles",
    "Remix & Mix Singles"
  ],

  [
    "other_singles",
    "Other Singles"
  ],

  [
    "other_releases",
    "Other Releases"
  ]
];


let data = null;

let currentArtist =
  null;


function escapeHtml(value) {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll(
      "'",
      "&#039;"
    );
}


function artistCreditHtml(
  release
) {

  const artists =
    release.credited_artists
    || [];


  if (!artists.length) {

    console.warn(
      "No structured artist credit:",
      release.title,
      release
    );

    return escapeHtml(
      release.artist_credit
    );
  }


  return artists
    .map(artist => {

      const name =
        artist.credit_name
        || artist.name
        || "";


      const href =
        `/artist/?id=${encodeURIComponent(
          artist.mbid
        )}`;


      return `
        <a
          href="${href}"
          class="artist-link"
          data-artist-link="1"
          style="
            color:#d7ae68;
            text-decoration:underline;
            text-underline-offset:3px;
            cursor:pointer;
            pointer-events:auto;
          "
          onclick="event.stopPropagation();"
          dir="auto"
        >${escapeHtml(
          name
        )}</a>${escapeHtml(
          artist.join_phrase
          || ""
        )}
      `;

    })
    .join("");
}

function formatDate(release) {

  if (!release.year) {
    return "Release date unknown";
  }


  if (
    release.date_precision === "day"
    && release.month
    && release.day
  ) {

    return (
      `${MONTHS[
        release.month - 1
      ]} `
      + `${release.day}, `
      + `${release.year}`
    );
  }


  if (
    release.date_precision === "month"
    && release.month
  ) {

    return (
      `${MONTHS[
        release.month - 1
      ]} `
      + `${release.year}`
    );
  }


  return String(
    release.year
  );
}


function releaseTypeLabel(
  release
) {

  const parts = [
    release.primary_type
    || "Release",

    ...(
      release.secondary_types
      || []
    )
  ];


  return parts.join(
    " · "
  );
}


function classifyRelease(
  release
) {

  const primary =
    release.primary_type
    || "";

  const secondary =
    new Set(
      release.secondary_types
      || []
    );


  /*
   * Every release appears exactly once.
   *
   * Album priority:
   * Soundtrack
   * Spoken word / Audio drama
   * Compilation
   * Live
   * Remix / DJ mix / Mixtape
   * Regular Album
   */

  if (primary === "Album") {

    if (
      secondary.has(
        "Soundtrack"
      )
    ) {
      return "soundtracks";
    }


    if (
      secondary.has(
        "Spokenword"
      )
      || secondary.has(
        "Audio drama"
      )
    ) {
      return "spoken_word";
    }


    if (
      secondary.has(
        "Compilation"
      )
    ) {
      return "compilations";
    }


    if (
      secondary.has(
        "Live"
      )
    ) {
      return "live_albums";
    }


    if (
      secondary.has(
        "Remix"
      )
      || secondary.has(
        "DJ-mix"
      )
      || secondary.has(
        "Mixtape/Street"
      )
    ) {
      return "mix_albums";
    }


    if (
      secondary.size === 0
    ) {
      return "albums";
    }


    return "other_albums";
  }


  if (primary === "EP") {

    if (
      secondary.has(
        "Live"
      )
    ) {
      return "live_eps";
    }


    if (
      secondary.size === 0
    ) {
      return "eps";
    }


    return "other_eps";
  }


  if (primary === "Single") {

    if (
      secondary.has(
        "Live"
      )
    ) {
      return "live_singles";
    }


    if (
      secondary.has(
        "Remix"
      )
      || secondary.has(
        "DJ-mix"
      )
      || secondary.has(
        "Mixtape/Street"
      )
    ) {
      return "mix_singles";
    }


    if (
      secondary.size === 0
    ) {
      return "singles";
    }


    return "other_singles";
  }


  return "other_releases";
}


function sortReleases(
  releases
) {

  return releases.sort(
    (a, b) =>

      (b.year || 0)
      - (a.year || 0)

      ||

      (b.month || 0)
      - (a.month || 0)

      ||

      (b.day || 0)
      - (a.day || 0)

      ||

      String(
        a.title || ""
      ).localeCompare(
        String(
          b.title || ""
        )
      )
  );
}


function cardHtml(
  release
) {

  const artwork =
    release.cover

      ? `
        <img
          src="${escapeHtml(
            release.cover
          )}"
          alt="${escapeHtml(
            release.title
          )} cover"
          loading="lazy"
          decoding="async"
        >
      `

      : `
        <div
          class="discography-placeholder">
          ♪
        </div>
      `;


  return `
    <article
      class="discography-card"
      tabindex="0"
      data-mbid="${escapeHtml(
        release.mbid
      )}"
    >

      <div class="discography-art">
        ${artwork}
      </div>


      <div class="discography-info">

        <h3
          class="discography-title"
          dir="auto">
          ${escapeHtml(
            release.title
          )}
        </h3>


        <p
          class="discography-credit"
          dir="auto">
          ${artistCreditHtml(
            release
          )}
        </p>


        <p class="discography-date">
          ${escapeHtml(
            formatDate(
              release
            )
          )}
        </p>

      </div>

    </article>
  `;
}


function renderSections(
  releases
) {

  const groups =
    new Map();


  for (
    const [key]
    of SECTION_ORDER
  ) {

    groups.set(
      key,
      []
    );
  }


  for (
    const release
    of releases
  ) {

    const key =
      classifyRelease(
        release
      );


    groups.get(
      key
    ).push(
      release
    );
  }


  sectionsRoot.innerHTML =
    SECTION_ORDER
      .map(
        ([key, label]) => {

          const items =
            groups.get(key)
            || [];


          if (!items.length) {
            return "";
          }


          return `
            <section
              class="discography-section">

              <div
                class="discography-heading">

                <h2>
                  ${escapeHtml(
                    label
                  )}
                </h2>

                <span
                  class="discography-count">
                  ${items.length}
                </span>

              </div>


              <div
                class="discography-grid">

                ${items
                  .map(
                    cardHtml
                  )
                  .join("")}

              </div>

            </section>
          `;

        }
      )
      .join("");


  sectionsRoot
    .querySelectorAll(
      ".discography-card"
    )
    .forEach(card => {

      const open = event => {

        if (
          event.target.closest(
            "[data-artist-link]"
          )
        ) {
          return;
        }


        if (
          event.type === "keydown"
          && ![
            "Enter",
            " "
          ].includes(
            event.key
          )
        ) {
          return;
        }


        const release =
          data.releases.find(
            item =>
              item.mbid
              === card.dataset.mbid
          );


        if (release) {
          openRelease(
            release
          );
        }

      };


      card.addEventListener(
        "click",
        open
      );


      card.addEventListener(
        "keydown",
        open
      );

    });
}


function openRelease(
  release
) {

  currentSharedRelease =
    release;


  const artHtml =
    release.cover

      ? `
        <img
          src="${escapeHtml(
            release.cover
          )}"
          alt="${escapeHtml(
            release.title
          )} cover"
        >
      `

      : `
        <div
          class="artwork-placeholder">
          ♪
        </div>
      `;


  const actions =
    release.actions
    || [];


  const actionsHtml =
    actions.length

      ? actions
          .filter(
            action =>
              action.url
              && action.site_label
          )
          .map(
            action => `
              <a
                class="dialog-action"
                href="${escapeHtml(
                  action.url
                )}"
                target="_blank"
                rel="noopener"
              >

                <span>
                  ${escapeHtml(
                    action.site_label
                  )}
                </span>

                <small>
                  ${escapeHtml(
                    action.action_kind
                    || "open"
                  )} ↗
                </small>

              </a>
            `
          )
          .join("")

      : `
        <p class="dialog-date">
          No streaming or purchase
          links are attached yet.
        </p>
      `;


  dialogContent.innerHTML = `
    <div class="dialog-layout">

      <div class="dialog-art">
        ${artHtml}
      </div>


      <div class="dialog-info">

        <div class="dialog-type">
          ${escapeHtml(
            releaseTypeLabel(
              release
            )
          )}
        </div>


        <h2 dir="auto">
          ${escapeHtml(
            release.title
          )}
        </h2>


        <p
          class="dialog-artist"
          dir="auto">
          ${artistCreditHtml(
            release
          )}
        </p>


        <p class="dialog-date">
          ${escapeHtml(
            formatDate(
              release
            )
          )}
        </p>


        <div class="dialog-actions">
          ${actionsHtml}
        </div>


        <div class="mb-link">

          <strong>
            Something wrong or missing?
          </strong>

          <p>
            Edit this release on MusicBrainz.
            Corrections made there will flow
            back into Jewish Music Timeline
            automatically after a future
            nightly update.
          </p>

          <a
            href="${escapeHtml(
              release.musicbrainz_url
            )}"
            target="_blank"
            rel="noopener"
          >
            Edit this release on
            MusicBrainz ↗
          </a>

        </div>

      </div>

    </div>
  `;


  dialog.showModal();
}


async function init() {

  const params =
    new URLSearchParams(
      location.search
    );


  const mbid =
    params.get("id");


  if (!mbid) {

    artistName.textContent =
      "Artist not found";

    emptyState.hidden =
      false;

    return;
  }


  try {

    const response =
      await fetch(
        "/data/search-index.json",
        {
          cache:
            "no-store"
        }
      );


    if (!response.ok) {

      throw new Error(
        `HTTP ${
          response.status
        }`
      );
    }


    data =
      await response.json();


    const artist =
      data.artists.find(
        item =>
          item.mbid === mbid
      );


    if (!artist) {

      artistName.textContent =
        "Artist not found";

      emptyState.hidden =
        false;

      return;
    }


    const releases =
      sortReleases(
        data.releases.filter(
          release =>
            (
              release.artist_mbids
              || []
            ).includes(
              mbid
            )
        )
      );


    const albumCount =
      releases.filter(
        release =>
          release.primary_type
          === "Album"
      ).length;


    document.title =
      `${artist.name} — `
      + "Jewish Music Timeline";


    currentArtist =
      artist;

    shareArtist.hidden =
      false;

    artistName.textContent =
      artist.name;


    artistStats.textContent =
      `${releases.length} release${
        releases.length === 1
          ? ""
          : "s"
      } · ${albumCount} album${
        albumCount === 1
          ? ""
          : "s"
      }`;


    renderSections(
      releases
    );

  }
  catch (error) {

    console.error(
      error
    );


    artistName.textContent =
      "Unable to load artist";


    emptyState.hidden =
      false;
  }

}


dialogClose
  .addEventListener(
    "click",
    () =>
      dialog.close()
  );


dialog
  .addEventListener(
    "click",
    event => {

      if (
        event.target
        === dialog
      ) {
        dialog.close();
      }

    }
  );


init();


/* ----------------------------------------------------
   Artist navigation
---------------------------------------------------- */

document.addEventListener(
  "click",
  event => {

    const link =
      event.target.closest(
        ".artist-link"
      );

    if (!link) {
      return;
    }

    const href =
      link.getAttribute(
        "href"
      );

    if (!href) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    window.location.assign(
      href
    );
  },
  true
);




/* Share current popup release */

if (dialogShare) {

  dialogShare.addEventListener(
    "click",
    event => {

      event.preventDefault();
      event.stopPropagation();

      if (!currentSharedRelease) {
        return;
      }

      const mbid =
        currentSharedRelease.mbid
        || currentSharedRelease.release_group_mbid;

      if (!mbid) {
        return;
      }

      JMTShare.share({
        title:
          `${currentSharedRelease.title} — `
          + `${currentSharedRelease.artist_credit}`,

        text:
          `${currentSharedRelease.title} by `
          + `${currentSharedRelease.artist_credit}`,

        url:
          JMTShare.releaseUrl(
            mbid
          ),
      });

    }
  );

}



/* Share artist discography */

if (shareArtist) {

  shareArtist.addEventListener(
    "click",
    () => {

      if (!currentArtist) {
        return;
      }

      JMTShare.share({
        title:
          `${currentArtist.name} — `
          + "Jewish Music Timeline",

        text:
          `${currentArtist.name} discography`,

        url:
          JMTShare.artistUrl(
            currentArtist.mbid
          ),
      });

    }
  );

}
