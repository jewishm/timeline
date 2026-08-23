const $ = id =>
  document.getElementById(id);


const content =
  $("releaseContent");

const notFound =
  $("notFound");


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
        dir="auto">
        ${escapeHtml(
          artist.credit_name
          || artist.name
          || ""
        )}
      </a>${escapeHtml(
        artist.join_phrase
        || ""
      )}

    `)
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


function typeLabel(release) {

  return [
    release.primary_type
    || "Release",

    ...(
      release.secondary_types
      || []
    )
  ].join(
    " · "
  );
}


function shareIcon() {

  return `
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true">

      <circle
        cx="18"
        cy="5"
        r="2.5">
      </circle>

      <circle
        cx="6"
        cy="12"
        r="2.5">
      </circle>

      <circle
        cx="18"
        cy="19"
        r="2.5">
      </circle>

      <path
        d="M8.2 10.8l7.5-4.4M8.2 13.2l7.5 4.4">
      </path>

    </svg>
  `;
}


function renderRelease(release) {

  const art =
    release.cover

      ? `
        <img
          src="${escapeHtml(
            release.cover
          )}"
          alt="${escapeHtml(
            release.title
          )} cover">
      `

      : `
        <div class="artwork-placeholder">
          ♪
        </div>
      `;


  const actions =
    (
      release.actions
      || []
    )
      .filter(
        action =>
          action.url
          && action.site_label
      );


  const actionsHtml =
    actions
      .map(action => `

        <a
          class="dialog-action"
          href="${escapeHtml(
            action.url
          )}"
          target="_blank"
          rel="noopener">

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
      .join("");


  content.innerHTML = `

    <div class="standalone-layout">

      <div class="standalone-art">
        ${art}
      </div>


      <div class="standalone-info">

        <div class="release-page-actions">

          <div class="release-type">
            ${escapeHtml(
              typeLabel(
                release
              )
            )}
          </div>


          <button
            id="shareRelease"
            class="share-button"
            type="button">

            ${shareIcon()}

            <span>
              Share
            </span>

          </button>

        </div>


        <h1
          class="standalone-title"
          dir="auto">

          ${escapeHtml(
            release.title
          )}

        </h1>


        <p
          class="standalone-artists"
          dir="auto">

          ${artistCreditHtml(
            release
          )}

        </p>


        <p class="standalone-date">

          ${escapeHtml(
            formatDate(
              release
            )
          )}

        </p>


        <div class="standalone-actions">
          ${actionsHtml}
        </div>


        <div class="mb-link">

          <strong>
            Something wrong or missing?
          </strong>

          <p>
            Edit this release on MusicBrainz.
            Corrections will appear here
            after a future nightly update.
          </p>

          <a
            href="${escapeHtml(
              release.musicbrainz_url
            )}"
            target="_blank"
            rel="noopener">

            Edit on MusicBrainz ↗

          </a>

        </div>

      </div>

    </div>
  `;


  $("shareRelease")
    .addEventListener(
      "click",
      () => {

        JMTShare.share({
          title:
            `${release.title} — `
            + `${release.artist_credit}`,

          text:
            `${release.title} by `
            + `${release.artist_credit}`,

          url:
            JMTShare.releaseUrl(
              release.mbid
            ),
        });

      }
    );
}


async function init() {

  const mbid =
    new URLSearchParams(
      location.search
    ).get(
      "id"
    );


  if (!mbid) {

    content.hidden =
      true;

    notFound.hidden =
      false;

    return;
  }


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


    const data =
      await response.json();


    const release =
      data.releases.find(
        item =>
          item.mbid === mbid
      );


    if (!release) {

      content.hidden =
        true;

      notFound.hidden =
        false;

      return;
    }


    document.title =
      `${release.title} — `
      + `${release.artist_credit} — `
      + "Jewish Music Timeline";


    renderRelease(
      release
    );

  }
  catch (error) {

    console.error(
      error
    );

    content.hidden =
      true;

    notFound.hidden =
      false;
  }

}


init();
