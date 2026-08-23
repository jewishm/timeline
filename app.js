const state = {
  index: null,
  availableMonths: [],
  currentYear: null,
  currentMonth: null,
  data: null,
  type: "all",
  search: "",
  sort: "desc"
};


const $ = id =>
  document.getElementById(id);


const monthTitle = $("monthTitle");
const monthSubtitle = $("monthSubtitle");
const statsEl = $("stats");
const timeline = $("timeline");
const resultInfo = $("resultInfo");
const emptyState = $("emptyState");

const monthSelect = $("monthSelect");
const yearSelect = $("yearSelect");

const prevMonth = $("prevMonth");
const nextMonth = $("nextMonth");

const searchInput = $("searchInput");

const sortButton =
  $("sortButton");


try {

  const savedSort =
    localStorage.getItem(
      "jmtTimelineSort"
    );

  if (
    savedSort === "asc"
    || savedSort === "desc"
  ) {
    state.sort =
      savedSort;
  }

}
catch (error) {

  console.warn(
    "Unable to read sort preference",
    error
  );
}

const dialog = $("releaseDialog");
const dialogContent = $("dialogContent");


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


function monthKey(year, month) {
  return `${year}-${String(month).padStart(2, "0")}`;
}


function fullMonthName(year, month) {
  return `${MONTHS[month - 1]} ${year}`;
}


function formatReleaseDate(release) {

  if (release.date_precision === "day") {
    const d = new Date(
      release.year,
      release.month - 1,
      release.day
    );

    return new Intl.DateTimeFormat(
      undefined,
      {
        month: "long",
        day: "numeric",
        year: "numeric"
      }
    ).format(d);
  }

  if (release.date_precision === "month") {
    return fullMonthName(
      release.year,
      release.month
    );
  }

  if (release.date_precision === "year") {
    return String(release.year);
  }

  return "Release date unknown";
}


function dayHeading(release) {

  if (!release.day) {
    return "Date unknown";
  }

  const d = new Date(
    release.year,
    release.month - 1,
    release.day
  );

  return new Intl.DateTimeFormat(
    undefined,
    {
      weekday: "long",
      month: "long",
      day: "numeric"
    }
  ).format(d);
}


function actionLabel(action) {

  if (action.action_kind === "buy") {
    return `Buy · ${action.site_label}`;
  }

  if (action.action_kind === "download") {
    return `Download · ${action.site_label}`;
  }

  return action.site_label;
}


function getCover(release, size = "500") {

  const cover = release.cover_art;

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


function artworkHtml(release) {

  const src500 = getCover(release, "500");
  const src250 = getCover(release, "250");
  const original =
    release.cover_art?.original || "";

  if (!src500) {
    return `
      <div class="artwork-placeholder">
        ♪
      </div>
    `;
  }

  return `
    <img
      class="artwork"
      src="${escapeHtml(src500)}"
      data-fallback-250="${escapeHtml(src250 || "")}"
      data-fallback-original="${escapeHtml(original)}"
      alt="${escapeHtml(release.title)} cover"
      loading="lazy"
      decoding="async"
    >
  `;
}


function attachImageFallbacks(root = document) {

  root.querySelectorAll(
    "img.artwork, .dialog-art img"
  ).forEach(img => {

    if (img.dataset.fallbackReady) {
      return;
    }

    img.dataset.fallbackReady = "1";

    img.addEventListener("error", () => {

      const current = img.src;

      const small =
        img.dataset.fallback250;

      const original =
        img.dataset.fallbackOriginal;

      if (
        small
        && !current.includes(small)
      ) {
        img.src = small;
        return;
      }

      if (
        original
        && !current.includes(original)
      ) {
        img.src = original;
        return;
      }

      const holder =
        document.createElement("div");

      holder.className =
        "artwork-placeholder";

      holder.textContent = "♪";

      img.replaceWith(holder);
    });

  });
}


function cardHtml(release) {

  const actions =
    release.actions || [];

  const visibleActions =
    actions.slice(0, 3);

  const extra =
    Math.max(
      0,
      actions.length - visibleActions.length
    );

  const actionHtml =
    visibleActions
      .map(action => `
        <a
          class="service-button"
          href="${escapeHtml(action.url)}"
          target="_blank"
          rel="noopener"
          data-direct-link
        >
          ${escapeHtml(actionLabel(action))}
        </a>
      `)
      .join("");

  const extraHtml =
    extra
      ? `<span class="service-more">+${extra} more</span>`
      : "";

  return `
    <article
      class="release-card"
      tabindex="0"
      data-release-group="${escapeHtml(
        release.release_group_mbid
      )}"
    >

      <div class="artwork-wrap">

        ${artworkHtml(release)}

        <span class="type-badge">
          ${escapeHtml(
            release.primary_type || "Release"
          )}
        </span>

      </div>

      <div class="card-body">

        <h3
          class="card-title"
          dir="auto">
          ${escapeHtml(release.title)}
        </h3>

        <p
          class="card-artist"
          dir="auto">
          ${artistCreditHtml(release)}
        </p>

        <div class="card-actions">
          ${actionHtml}
          ${extraHtml}
        </div>

      </div>

    </article>
  `;
}


function filteredReleases() {

  if (!state.data) {
    return [];
  }

  const query =
    state.search
      .trim()
      .toLocaleLowerCase();

  return state.data.releases.filter(
    release => {

      if (
        state.type !== "all"
        && release.primary_type !== state.type
      ) {
        return false;
      }

      if (!query) {
        return true;
      }

      const haystack = [
        release.title,
        release.artist_credit,
        ...(release.collection_artists || [])
          .map(a => a.name)
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase();

      return haystack.includes(query);
    }
  );
}


function renderStats() {

  const stats =
    state.data?.stats || {};

  const types =
    stats.types || {};

  statsEl.innerHTML = `
    <div class="stat">
      <strong>${stats.release_groups || 0}</strong>
      <span>Releases</span>
    </div>

    <div class="stat">
      <strong>${types.Album || 0}</strong>
      <span>Albums</span>
    </div>

    <div class="stat">
      <strong>${types.Single || 0}</strong>
      <span>Singles</span>
    </div>

    <div class="stat">
      <strong>${types.EP || 0}</strong>
      <span>EPs</span>
    </div>
  `;
}


function sortTimelineReleases(
  releases
) {

  return [...releases].sort(
    (a, b) => {

      const aDay =
        Number(a.day) || 0;

      const bDay =
        Number(b.day) || 0;


      /*
       * Unknown-day releases always stay
       * at the bottom regardless of order.
       */

      if (!aDay && !bDay) {
        return 0;
      }

      if (!aDay) {
        return 1;
      }

      if (!bDay) {
        return -1;
      }


      if (state.sort === "asc") {
        return aDay - bDay;
      }


      return bDay - aDay;
    }
  );
}


function updateSortButton() {

  if (!sortButton) {
    return;
  }


  if (state.sort === "asc") {

    sortButton.textContent =
      "↑ Oldest";

    sortButton.title =
      "Oldest releases first";

    return;
  }


  sortButton.textContent =
    "↓ Newest";

  sortButton.title =
    "Newest releases first";
}


function renderTimeline() {

  const releases =
    sortTimelineReleases(
      filteredReleases()
    );

  updateSortButton();

  resultInfo.textContent =
    `${releases.length} release${
      releases.length === 1 ? "" : "s"
    } shown`;

  timeline.innerHTML = "";

  emptyState.hidden =
    releases.length !== 0;

  if (!releases.length) {
    return;
  }

  const groups = new Map();

  for (const release of releases) {

    const key =
      release.day
        ? String(release.day)
        : "unknown";

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key).push(release);
  }


  for (const releasesForDay of groups.values()) {

    const section =
      document.createElement("section");

    section.className =
      "day-section";

    const heading =
      dayHeading(releasesForDay[0]);

    section.innerHTML = `
      <div class="day-heading">
        <h2>${escapeHtml(heading)}</h2>
      </div>

      <div class="release-grid">
        ${releasesForDay
          .map(cardHtml)
          .join("")}
      </div>
    `;

    timeline.appendChild(section);
  }


  attachImageFallbacks(timeline);

  timeline
    .querySelectorAll(".release-card")
    .forEach(card => {

      const open = event => {

        if (
          event.target.closest(
            "[data-direct-link], [data-artist-link]"
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
            r =>
              r.release_group_mbid
              === mbid
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

  const cover =
    getCover(release, "1200")
    || getCover(release, "500");

  const small =
    getCover(release, "250");

  const original =
    release.cover_art?.original || "";

  const artHtml =
    cover
      ? `
        <img
          src="${escapeHtml(cover)}"
          data-fallback-250="${escapeHtml(
            small || ""
          )}"
          data-fallback-original="${escapeHtml(
            original
          )}"
          alt="${escapeHtml(release.title)} cover"
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
      ? actions.map(action => `
          <a
            class="dialog-action"
            href="${escapeHtml(action.url)}"
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
                action.action_kind || "open"
              )} ↗
            </small>
          </a>
        `).join("")
      : `
        <p class="dialog-date">
          No streaming or purchase links are attached yet.
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
            release.primary_type || "Release"
          )}
        </div>

        <h2 dir="auto">
          ${escapeHtml(release.title)}
        </h2>

        <p
          class="dialog-artist"
          dir="auto">
          ${artistCreditHtml(release)}
        </p>

        <p class="dialog-date">
          ${escapeHtml(
            formatReleaseDate(release)
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
            Corrections made there will flow back
            into Jewish Music Timeline automatically
            after a future nightly update.
          </p>

          <a
            href="${escapeHtml(
              release.musicbrainz_url
            )}"
            target="_blank"
            rel="noopener"
          >
            Edit this release on MusicBrainz ↗
          </a>

        </div>

      </div>

    </div>
  `;

  attachImageFallbacks(
    dialogContent
  );

  dialog.showModal();
}


function currentPosition() {

  return state.availableMonths.findIndex(
    item =>
      item.year === state.currentYear
      && item.month === state.currentMonth
  );
}


function updateNavigationButtons() {

  const pos =
    currentPosition();

  prevMonth.disabled =
    pos <= 0;

  nextMonth.disabled =
    pos < 0
    || pos >=
      state.availableMonths.length - 1;
}


function populateSelectors() {

  const years = [
    ...new Set(
      state.availableMonths.map(
        item => item.year
      )
    )
  ].sort((a, b) => b - a);


  yearSelect.innerHTML =
    years
      .map(year => `
        <option value="${year}">
          ${year}
        </option>
      `)
      .join("");


  monthSelect.innerHTML =
    MONTHS
      .map(
        (name, index) => `
          <option value="${index + 1}">
            ${name}
          </option>
        `
      )
      .join("");
}


function syncSelectors() {

  yearSelect.value =
    String(state.currentYear);

  monthSelect.value =
    String(state.currentMonth);
}


function monthExists(year, month) {

  return state.availableMonths.some(
    item =>
      item.year === Number(year)
      && item.month === Number(month)
  );
}


async function loadMonth(
  year,
  month,
  pushHistory = true
) {

  if (!monthExists(year, month)) {
    return;
  }


  state.currentYear =
    Number(year);

  state.currentMonth =
    Number(month);


  const yearViewLink =
    document.getElementById(
      "yearViewLink"
    );

  if (yearViewLink) {
    yearViewLink.href =
      `/year.html?year=${
        state.currentYear
      }`;
  }


  monthTitle.textContent =
    fullMonthName(
      state.currentYear,
      state.currentMonth
    );

  monthSubtitle.textContent =
    "Loading releases…";


  syncSelectors();
  updateNavigationButtons();


  const path =
    `/data/months/${
      state.currentYear
    }/${
      String(
        state.currentMonth
      ).padStart(2, "0")
    }.json`;


  try {

    const response =
      await fetch(
        `${path}?v=${Date.now()}`,
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


    monthSubtitle.textContent = "";


    renderStats();
    renderTimeline();


    if (pushHistory) {

      const params =
        new URLSearchParams();

      params.set(
        "year",
        state.currentYear
      );

      params.set(
        "month",
        state.currentMonth
      );

      history.pushState(
        null,
        "",
        `?${params.toString()}`
      );
    }

  }
  catch (error) {

    console.error(error);

    monthSubtitle.textContent =
      "Unable to load this month.";

    timeline.innerHTML = "";

    resultInfo.textContent = "";
  }
}


function navigate(delta) {

  const pos =
    currentPosition();

  const next =
    state.availableMonths[
      pos + delta
    ];

  if (!next) {
    return;
  }

  loadMonth(
    next.year,
    next.month
  );
}


function chooseInitialMonth() {

  const params =
    new URLSearchParams(
      location.search
    );

  const requestedYear =
    Number(
      params.get("year")
    );

  const requestedMonth =
    Number(
      params.get("month")
    );


  if (
    requestedYear
    && requestedMonth
    && monthExists(
      requestedYear,
      requestedMonth
    )
  ) {
    return {
      year: requestedYear,
      month: requestedMonth
    };
  }


  const now =
    new Date();

  const current = {
    year: now.getFullYear(),
    month: now.getMonth() + 1
  };


  if (
    monthExists(
      current.year,
      current.month
    )
  ) {
    return current;
  }


  return (
    state.availableMonths[
      state.availableMonths.length - 1
    ]
  );
}


async function init() {

  try {

    const response =
      await fetch(
        `/data/index.json?v=${Date.now()}`,
        {
          cache: "no-store"
        }
      );

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`
      );
    }

    state.index =
      await response.json();


    state.availableMonths =
      state.index.years
        .flatMap(year =>
          year.months.map(month => ({
            year: year.year,
            month: month.month
          }))
        )
        .sort(
          (a, b) =>
            a.year - b.year
            || a.month - b.month
        );


    populateSelectors();


    const initial =
      chooseInitialMonth();


    await loadMonth(
      initial.year,
      initial.month,
      false
    );

  }
  catch (error) {

    console.error(error);

    monthTitle.textContent =
      "Jewish Music Timeline";

    monthSubtitle.textContent =
      "Unable to load timeline data.";
  }
}


prevMonth.addEventListener(
  "click",
  () => navigate(-1)
);

nextMonth.addEventListener(
  "click",
  () => navigate(1)
);


yearSelect.addEventListener(
  "change",
  () => {

    let year =
      Number(yearSelect.value);

    let month =
      Number(monthSelect.value);


    if (!monthExists(year, month)) {

      const first =
        state.availableMonths.find(
          item =>
            item.year === year
        );

      if (!first) {
        return;
      }

      month = first.month;
    }

    loadMonth(
      year,
      month
    );
  }
);


monthSelect.addEventListener(
  "change",
  () => {

    const year =
      Number(yearSelect.value);

    const month =
      Number(monthSelect.value);


    if (
      monthExists(
        year,
        month
      )
    ) {
      loadMonth(
        year,
        month
      );
      return;
    }


    monthSelect.value =
      String(
        state.currentMonth
      );
  }
);


document
  .querySelectorAll(".filter")
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        document
          .querySelectorAll(".filter")
          .forEach(
            b =>
              b.classList.remove(
                "active"
              )
          );

        button.classList.add(
          "active"
        );

        state.type =
          button.dataset.type;

        renderTimeline();
      }
    );

  });


searchInput.addEventListener(
  "input",
  () => {

    state.search =
      searchInput.value;

    renderTimeline();
  }
);


$("dialogClose").addEventListener(
  "click",
  () => dialog.close()
);


dialog.addEventListener(
  "click",
  event => {

    const rect =
      dialog.getBoundingClientRect();

    const outside =
      event.clientX < rect.left
      || event.clientX > rect.right
      || event.clientY < rect.top
      || event.clientY > rect.bottom;

    if (outside) {
      dialog.close();
    }
  }
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

    const month =
      Number(
        params.get("month")
      );

    if (
      monthExists(year, month)
    ) {
      loadMonth(
        year,
        month,
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



if (sortButton) {

  sortButton.addEventListener(
    "click",
    () => {

      state.sort =
        state.sort === "desc"
          ? "asc"
          : "desc";


      try {

        localStorage.setItem(
          "jmtTimelineSort",
          state.sort
        );

      }
      catch (error) {

        console.warn(
          "Unable to save sort preference",
          error
        );
      }


      renderTimeline();
    }
  );

}
