const $ = id =>
  document.getElementById(id);


const searchInput = $("searchInput");
const resultInfo = $("resultInfo");

const artistSection = $("artistSection");
const artistResults = $("artistResults");
const artistCount = $("artistCount");

const releaseSection = $("releaseSection");
const releaseHeading = $("releaseHeading");
const releaseResults = $("releaseResults");
const releaseCount = $("releaseCount");

const otherReleaseSection = $("otherReleaseSection");
const otherReleaseResults = $("otherReleaseResults");
const otherReleaseCount = $("otherReleaseCount");

const welcomeState = $("welcomeState");
const emptyState = $("emptyState");

const dialog = $("releaseDialog");
const dialogContent = $("dialogContent");
const dialogClose = $("dialogClose");


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


const state = {
  data: null,
  artistByMbid: new Map(),
  query: "",
  selectedArtist: null
};


function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function artistCreditHtml(release) {

  const artists =
    release.credited_artists
    || [];

  if (!artists.length) {

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

      return `
        <a
          class="artist-link"
          data-artist-link
          href="/artist/?id=${encodeURIComponent(
            artist.mbid
          )}"
          dir="auto"
        >${escapeHtml(name)}</a>${escapeHtml(
          artist.join_phrase
          || ""
        )}
      `;

    })
    .join("");
}


function normalize(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}


function scoreTerms(
  query,
  canonical,
  terms
) {
  if (!query) {
    return 0;
  }

  const canonicalNormalized =
    normalize(canonical);

  const values =
    Array.isArray(terms)
      ? terms
      : [];

  if (canonicalNormalized === query) {
    return 1000;
  }

  if (values.includes(query)) {
    return 950;
  }

  if (
    canonicalNormalized.startsWith(
      query
    )
  ) {
    return 900;
  }

  if (
    values.some(
      value =>
        value.startsWith(query)
    )
  ) {
    return 850;
  }

  if (
    canonicalNormalized.includes(
      query
    )
  ) {
    return 800;
  }

  if (
    values.some(
      value =>
        value.includes(query)
    )
  ) {
    return 750;
  }

  const tokens =
    query.split(" ").filter(Boolean);

  if (
    tokens.length > 1
    && tokens.every(
      token =>
        values.some(
          value =>
            value.includes(token)
        )
    )
  ) {
    return 650;
  }

  return 0;
}


function artistScore(
  artist,
  query
) {
  return scoreTerms(
    query,
    artist.name,
    artist.terms
  );
}


function releaseScore(
  release,
  query
) {
  let score = scoreTerms(
    query,
    release.title,
    release.terms
  );

  for (
    const mbid
    of release.artist_mbids || []
  ) {
    const artist =
      state.artistByMbid.get(mbid);

    if (!artist) {
      continue;
    }

    const aScore =
      artistScore(
        artist,
        query
      );

    if (aScore > 0) {
      score = Math.max(
        score,
        aScore - 120
      );
    }
  }

  return score;
}


function formatReleaseDate(release) {
  if (!release.year) {
    return "Release date unknown";
  }

  if (
    release.date_precision === "day"
    && release.month
    && release.day
  ) {
    return (
      `${MONTHS[release.month - 1]} `
      + `${release.day}, `
      + `${release.year}`
    );
  }

  if (
    release.date_precision === "month"
    && release.month
  ) {
    return (
      `${MONTHS[release.month - 1]} `
      + `${release.year}`
    );
  }

  return String(release.year);
}


function actionLabel(action) {
  if (
    action.action_kind === "buy"
  ) {
    return `Buy · ${action.site_label}`;
  }

  if (
    action.action_kind === "download"
  ) {
    return (
      `Download · ${action.site_label}`
    );
  }

  return action.site_label;
}


function artistResultHtml(artist) {
  const count =
    artist.release_count || 0;

  return `
    <a
      class="artist-search-result"
      href="/artist/?id=${encodeURIComponent(
        artist.mbid
      )}"
    >
      <span
        class="artist-search-name"
        dir="auto">
        ${escapeHtml(artist.name)}
      </span>

      <span class="artist-search-meta">
        ${count}
        release${count === 1 ? "" : "s"}
      </span>
    </a>
  `;
}


function releaseResultHtml(release) {
  const art =
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
        <div class="release-search-placeholder">
          ♪
        </div>
      `;

  return `
    <article
      class="release-search-result"
      tabindex="0"
      data-release-group="${escapeHtml(
        release.mbid
      )}"
    >

      <div class="release-search-art">
        ${art}
      </div>

      <div class="release-search-body">

        <h3
          class="release-search-title"
          dir="auto">
          ${escapeHtml(
            release.title
          )}
        </h3>

        <p
          class="release-search-artist"
          dir="auto">
          ${artistCreditHtml(release)}
        </p>

      </div>

    </article>
  `;
}

function attachReleaseHandlers(
  root = releaseResults
) {
  root
    .querySelectorAll(
      ".release-search-result"
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
          && !["Enter", " "]
            .includes(event.key)
        ) {
          return;
        }

        const mbid =
          card.dataset.releaseGroup;

        const release =
          state.data.releases.find(
            item =>
              item.mbid === mbid
          );

        if (release) {
          openRelease(release);
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


function openRelease(release) {
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
        <div class="artwork-placeholder">
          ♪
        </div>
      `;


  const actions =
    release.actions || [];


  const actionsHtml =
    actions.length
      ? actions
          .filter(
            action =>
              action.url
              && action.site_label
          )
          .map(action => `
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
          `)
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
            release.primary_type
            || "Release"
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
          ${artistCreditHtml(release)}
        </p>

        <p class="dialog-date">
          ${escapeHtml(
            formatReleaseDate(
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
            Edit this release on
            MusicBrainz. Corrections made
            there will flow back into
            Jewish Music Timeline
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


function setResultVisibility(
  artistTotal,
  releaseTotal
) {
  artistSection.hidden =
    artistTotal === 0;

  releaseSection.hidden =
    releaseTotal === 0;

  emptyState.hidden =
    artistTotal !== 0
    || releaseTotal !== 0;

  welcomeState.hidden = true;
}


function renderArtistSelection(
  artist
) {
  state.selectedArtist =
    artist.mbid;

  searchInput.value =
    artist.name;

  const releases =
    state.data.releases
      .filter(
        release =>
          (
            release.artist_mbids
            || []
          ).includes(
            artist.mbid
          )
      )
      .sort(
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
          String(a.title)
            .localeCompare(
              String(b.title)
            )
      );


  const albums =
    releases.filter(
      release =>
        release.primary_type
        === "Album"
    );


  const otherReleases =
    releases.filter(
      release =>
        release.primary_type
        !== "Album"
    );


  artistResults.innerHTML =
    artistResultHtml(artist);

  artistCount.textContent =
    "1 artist";

  artistSection.hidden = false;


  releaseHeading.textContent =
    "Albums";

  releaseResults.innerHTML =
    albums
      .map(releaseResultHtml)
      .join("");

  releaseCount.textContent =
    `${albums.length} album${
      albums.length === 1
        ? ""
        : "s"
    }`;

  releaseSection.hidden =
    albums.length === 0;


  otherReleaseResults.innerHTML =
    otherReleases
      .map(releaseResultHtml)
      .join("");

  otherReleaseCount.textContent =
    `${otherReleases.length} release${
      otherReleases.length === 1
        ? ""
        : "s"
    }`;

  otherReleaseSection.hidden =
    otherReleases.length === 0;


  welcomeState.hidden = true;
  emptyState.hidden =
    releases.length !== 0;


  resultInfo.textContent =
    `${releases.length} release${
      releases.length === 1
        ? ""
        : "s"
    } by ${artist.name}`;


  attachReleaseHandlers(
    releaseResults
  );

  attachReleaseHandlers(
    otherReleaseResults
  );
}

function renderSearch() {
  state.selectedArtist = null;

  releaseHeading.textContent =
    "Releases";

  otherReleaseSection.hidden = true;
  otherReleaseResults.innerHTML = "";
  otherReleaseCount.textContent = "";

  const query =
    normalize(
      state.query
    );

  if (!query) {
    artistSection.hidden = true;
    releaseSection.hidden = true;
    emptyState.hidden = true;
    welcomeState.hidden = false;
    resultInfo.textContent = "";
    return;
  }


  const artists =
    state.data.artists
      .map(artist => ({
        artist,
        score:
          artistScore(
            artist,
            query
          )
      }))
      .filter(
        item =>
          item.score > 0
      )
      .sort(
        (a, b) =>
          b.score - a.score
          ||
          b.artist.release_count
          - a.artist.release_count
          ||
          a.artist.name.localeCompare(
            b.artist.name
          )
      );


  const releases =
    state.data.releases
      .map(release => ({
        release,
        score:
          releaseScore(
            release,
            query
          )
      }))
      .filter(
        item =>
          item.score > 0
      )
      .sort(
        (a, b) =>
          b.score - a.score
          ||
          (b.release.year || 0)
          - (a.release.year || 0)
          ||
          String(
            a.release.title
          ).localeCompare(
            String(
              b.release.title
            )
          )
      );


  const visibleArtists =
    artists.slice(0, 30);

  const visibleReleases =
    releases.slice(0, 150);


  artistResults.innerHTML =
    visibleArtists
      .map(
        item =>
          artistResultHtml(
            item.artist
          )
      )
      .join("");


  releaseResults.innerHTML =
    visibleReleases
      .map(
        item =>
          releaseResultHtml(
            item.release
          )
      )
      .join("");


  artistCount.textContent =
    artists.length > 30
      ? `30 of ${artists.length}`
      : `${artists.length}`;


  releaseCount.textContent =
    releases.length > 150
      ? `150 of ${releases.length}`
      : `${releases.length}`;


  resultInfo.textContent =
    `${artists.length} artist${
      artists.length === 1
        ? ""
        : "s"
    } · ${releases.length} release${
      releases.length === 1
        ? ""
        : "s"
    }`;


  setResultVisibility(
    artists.length,
    releases.length
  );

  attachReleaseHandlers();
}


function updateQueryUrl(value) {
  const url =
    new URL(
      window.location.href
    );

  url.search = "";

  if (value.trim()) {
    url.searchParams.set(
      "q",
      value.trim()
    );
  }

  history.replaceState(
    null,
    "",
    url
  );
}


async function init() {
  try {
    const response =
      await fetch(
        "/data/search-index.json",
        {
          cache: "no-store"
        }
      );

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`
      );
    }

    state.data =
      await response.json();

    state.artistByMbid =
      new Map(
        state.data.artists.map(
          artist => [
            artist.mbid,
            artist
          ]
        )
      );


    const params =
      new URLSearchParams(
        window.location.search
      );

    const artistMbid =
      params.get("artist");

    const query =
      params.get("q") || "";


    if (
      artistMbid
      && state.artistByMbid.has(
        artistMbid
      )
    ) {
      renderArtistSelection(
        state.artistByMbid.get(
          artistMbid
        )
      );
    }
    else {
      state.query = query;
      searchInput.value = query;
      renderSearch();
    }
  }
  catch (error) {
    console.error(error);

    welcomeState.hidden = true;
    emptyState.hidden = false;

    emptyState.querySelector("h2")
      .textContent =
        "Search is temporarily unavailable";

    emptyState.querySelector("p")
      .textContent =
        "The search index could not be loaded.";
  }
}


let inputTimer = null;

searchInput.addEventListener(
  "input",
  () => {
    clearTimeout(inputTimer);

    inputTimer = setTimeout(
      () => {
        state.query =
          searchInput.value;

        state.selectedArtist =
          null;

        updateQueryUrl(
          state.query
        );

        renderSearch();
      },
      70
    );
  }
);


dialogClose.addEventListener(
  "click",
  () => {
    dialog.close();
  }
);


dialog.addEventListener(
  "click",
  event => {
    if (event.target === dialog) {
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

