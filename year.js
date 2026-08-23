const state = {
  years: [],
  year: null,
  data: null,
  artistByName: new Map()
};


const MONTH_NAMES = [
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


const $ = id =>
  document.getElementById(id);


const yearTitle =
  $("yearTitle");

const yearSelect =
  $("yearSelect");

const prevYear =
  $("prevYear");

const nextYear =
  $("nextYear");

const stats =
  $("stats");

const monthGrid =
  $("monthGrid");

const topArtists =
  $("topArtists");

const topArtistsSection =
  $("topArtistsSection");

const yearOnlySection =
  $("yearOnlySection");

const yearOnlyGrid =
  $("yearOnlyGrid");


function escapeHtml(value) {

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
    )
    .replaceAll(
      "'",
      "&#039;"
    );
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
    .map(artist => `
      <a
        class="artist-link"
        href="/artist/?id=${encodeURIComponent(
          artist.mbid
        )}"
        dir="auto"
      >${escapeHtml(
        artist.credit_name
        || artist.name
        || ""
      )}</a>${escapeHtml(
        artist.join_phrase
        || ""
      )}
    `)
    .join("");
}


function artistMbid(artist) {

  return (
    artist.mbid
    || state.artistByName.get(
      artist.name
    )
    || null
  );
}


function coverUrl(
  release,
  size = "250"
) {

  const cover =
    release?.cover_art;

  if (!cover) {
    return null;
  }

  return (
    cover.thumbnails?.[size]
    || cover.thumbnails?.["250"]
    || cover.original
    || null
  );
}


function currentIndex() {

  return state.years.indexOf(
    state.year
  );
}


function updateArrows() {

  const index =
    currentIndex();

  prevYear.disabled =
    index <= 0;

  nextYear.disabled =
    index < 0
    || index >=
       state.years.length - 1;
}


function renderStats() {

  const s =
    state.data.stats;

  const types =
    s.types || {};

  stats.innerHTML = `
    <div class="stat">
      <strong>
        ${s.release_groups || 0}
      </strong>
      <span>Releases</span>
    </div>

    <div class="stat">
      <strong>
        ${s.artists || 0}
      </strong>
      <span>Artists</span>
    </div>

    <div class="stat">
      <strong>
        ${types.Album || 0}
      </strong>
      <span>Albums</span>
    </div>

    <div class="stat">
      <strong>
        ${
          (types.Single || 0)
          + (types.EP || 0)
        }
      </strong>
      <span>Singles + EPs</span>
    </div>
  `;
}


function monthArtwork(month) {

  const featured =
    month.featured || [];

  const blocks = [];

  for (let i = 0; i < 4; i++) {

    const release =
      featured[i];

    const src =
      coverUrl(
        release,
        "250"
      );

    if (src) {

      blocks.push(`
        <img
          src="${escapeHtml(src)}"
          alt=""
          loading="lazy"
        >
      `);

    }
    else {

      blocks.push(`
        <div class="month-placeholder">
          ♪
        </div>
      `);
    }
  }

  return blocks.join("");
}


function renderMonths() {

  monthGrid.innerHTML =
    state.data.months
      .map(month => {

        const empty =
          month.release_groups === 0;

        const href =
          empty
            ? "#"
            : `/?year=${
                state.year
              }&month=${
                month.month
              }`;

        return `
          <a
            class="month-card ${
              empty ? "empty" : ""
            }"
            href="${href}"
          >

            <div class="month-art">
              ${monthArtwork(month)}
            </div>

            <div class="month-info">

              <strong>
                ${
                  MONTH_NAMES[
                    month.month - 1
                  ]
                }
              </strong>

              <span class="month-count">
                ${
                  month.release_groups
                } release${
                  month.release_groups === 1
                    ? ""
                    : "s"
                }
              </span>

            </div>

          </a>
        `;
      })
      .join("");
}


function renderArtists() {

  const artists =
    state.data.top_artists
    || [];


  topArtistsSection.hidden =
    artists.length === 0;


  topArtists.innerHTML =
    artists
      .map(
        (artist, index) => {

          const mbid =
            artistMbid(
              artist
            );


          const nameHtml =
            mbid

              ? `
                <a
                  class="artist-name artist-link"
                  dir="auto"
                  href="/artist/?id=${encodeURIComponent(
                    mbid
                  )}"
                >
                  ${index + 1}.
                  ${escapeHtml(
                    artist.name
                  )}
                </a>
              `

              : `
                <span
                  class="artist-name"
                  dir="auto"
                >
                  ${index + 1}.
                  ${escapeHtml(
                    artist.name
                  )}
                </span>
              `;


          return `
            <div class="artist-row">

              ${nameHtml}

              <span class="artist-count">
                ${
                  artist.release_groups
                }
              </span>

            </div>
          `;

        }
      )
      .join("");
}

function releaseCard(
  release
) {

  const src =
    coverUrl(
      release,
      "250"
    );


  const artwork =
    src

      ? `
        <img
          src="${escapeHtml(src)}"
          alt="${escapeHtml(
            release.title
          )} cover"
          loading="lazy"
        >
      `

      : `
        <div
          class="release-placeholder">
          ♪
        </div>
      `;


  return `
    <article
      class="release-card">

      <a
        class="release-main-link"
        href="${escapeHtml(
          release.musicbrainz_url
        )}"
        target="_blank"
        rel="noopener"
      >

        <div class="release-art">
          ${artwork}
        </div>

      </a>


      <div class="release-info">

        <h3
          class="release-title"
          dir="auto">

          <a
            class="release-title-link"
            href="${escapeHtml(
              release.musicbrainz_url
            )}"
            target="_blank"
            rel="noopener"
          >
            ${escapeHtml(
              release.title
            )}
          </a>

        </h3>


        <p
          class="release-artist"
          dir="auto">
          ${artistCreditHtml(
            release
          )}
        </p>

      </div>

    </article>
  `;
}

function renderYearOnly() {

  const releases =
    state.data
      .year_only_releases
      || [];

  yearOnlySection.hidden =
    releases.length === 0;

  yearOnlyGrid.innerHTML =
    releases
      .map(releaseCard)
      .join("");
}


async function loadYear(
  year,
  pushHistory = true
) {

  state.year =
    Number(year);

  yearTitle.textContent =
    state.year;

  yearSelect.value =
    String(state.year);

  updateArrows();


  const response =
    await fetch(
      `/data/years/${
        state.year
      }.json?v=${
        Date.now()
      }`,
      {
        cache: "no-store"
      }
    );


  if (!response.ok) {

    throw new Error(
      `Unable to load year ${
        state.year
      }`
    );
  }


  state.data =
    await response.json();


  const monthViewLink =
    document.getElementById(
      "monthViewLink"
    );

  if (monthViewLink) {

    const firstMonth =
      state.data.months.find(
        month =>
          month.release_groups > 0
      );

    if (firstMonth) {
      monthViewLink.href =
        `/?year=${state.year}&month=${firstMonth.month}`;
    }
  }


  renderStats();
  renderMonths();
  renderArtists();
  renderYearOnly();


  if (pushHistory) {

    const params =
      new URLSearchParams();

    params.set(
      "year",
      state.year
    );

    history.pushState(
      null,
      "",
      `/year.html?${
        params.toString()
      }`
    );
  }
}


function navigate(
  delta
) {

  const index =
    currentIndex();

  const next =
    state.years[
      index + delta
    ];

  if (next === undefined) {
    return;
  }

  loadYear(next);
}


async function init() {

  try {

    const artistResponse =
      await fetch(
        `/data/artist-map.json?v=${
          Date.now()
        }`,
        {
          cache: "no-store"
        }
      );


    if (artistResponse.ok) {

      const artistIndex =
        await artistResponse.json();


      for (
        const artist
        of (
          artistIndex.artists
          || []
        )
      ) {

        if (
          artist.name
          && artist.mbid
          && !state.artistByName.has(
            artist.name
          )
        ) {

          state.artistByName.set(
            artist.name,
            artist.mbid
          );
        }

      }

    }

  }
  catch (error) {

    console.warn(
      "Unable to load artist links",
      error
    );
  }


  const response =
    await fetch(
      `/data/years/index.json?v=${
        Date.now()
      }`,
      {
        cache: "no-store"
      }
    );


  if (!response.ok) {

    yearTitle.textContent =
      "Unable to load";

    return;
  }


  const index =
    await response.json();


  state.years =
    index.years
      .map(
        item => item.year
      )
      .sort(
        (a, b) => a - b
      );


  yearSelect.innerHTML =
    [...state.years]
      .reverse()
      .map(
        year => `
          <option value="${year}">
            ${year}
          </option>
        `
      )
      .join("");


  const params =
    new URLSearchParams(
      location.search
    );

  const requested =
    Number(
      params.get("year")
    );


  const current =
    new Date()
      .getFullYear();


  let initial =
    state.years.includes(
      requested
    )
      ? requested
      : (
          state.years.includes(
            current
          )
            ? current
            : state.years[
                state.years.length - 1
              ]
        );


  await loadYear(
    initial,
    false
  );
}


prevYear.addEventListener(
  "click",
  () => navigate(-1)
);


nextYear.addEventListener(
  "click",
  () => navigate(1)
);


yearSelect.addEventListener(
  "change",
  () =>
    loadYear(
      Number(
        yearSelect.value
      )
    )
);


window.addEventListener(
  "popstate",
  () => {

    const params =
      new URLSearchParams(
        location.search
      );

    const year =
      Number(
        params.get("year")
      );

    if (
      state.years.includes(
        year
      )
    ) {
      loadYear(
        year,
        false
      );
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

