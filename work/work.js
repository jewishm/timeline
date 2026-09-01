const $ = id =>
  document.getElementById(id);


const loadingState =
  $("loadingState");

const errorState =
  $("errorState");

const workContent =
  $("workContent");

const workTitle =
  $("workTitle");

const workStats =
  $("workStats");

const musicbrainzLink =
  $("musicbrainzLink");

const versionCount =
  $("versionCount");

const versionGrid =
  $("versionGrid");


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


function dateText(version) {

  if (!version.year) {
    return "Date unknown";
  }

  return String(
    version.year
  );
}


function actionLabel(action) {

  if (
    action.action_kind
    === "buy"
  ) {
    return (
      "Buy · "
      + action.site_label
    );
  }

  if (
    action.action_kind
    === "download"
  ) {
    return (
      "Download · "
      + action.site_label
    );
  }

  return (
    action.site_label
    || "Listen"
  );
}


function versionHtml(version) {

  const art = version.cover
    ? `
      <img
        src="${escapeHtml(
          version.cover
        )}"
        alt="${escapeHtml(
          version.release_title
          || version.title
        )} cover"
        loading="lazy"
        decoding="async">
    `
    : `
      <div
        class="version-placeholder">
        ♪
      </div>
    `;


  const actions = (
    version.actions
    || []
  )
    .filter(
      action =>
        action.url
        && action.site_label
    )
    .slice(
      0,
      3
    )
    .map(
      action => `
        <a
          class="version-button"
          href="${escapeHtml(
            action.url
          )}"
          target="_blank"
          rel="noopener">
          ${escapeHtml(
            actionLabel(
              action
            )
          )}
        </a>
      `
    )
    .join("");


  const releaseUrl =
    (
      "/release/?id="
      + encodeURIComponent(
          version
            .release_group_mbid
        )
    );


  return `
    <article class="version-card">

      <div class="version-art">

        ${art}

        <span class="version-year">
          ${escapeHtml(
            dateText(
              version
            )
          )}
        </span>

      </div>


      <div class="version-body">

        <h3
          class="version-title"
          dir="auto">
          ${escapeHtml(
            version.title
          )}
        </h3>


        <p
          class="version-artist"
          dir="auto">
          ${escapeHtml(
            version.artist_credit
          )}
        </p>


        <p
          class="version-release"
          dir="auto">
          ${escapeHtml(
            version.release_title
          )}
        </p>


        <div class="version-buttons">

          <a
            class="
              version-button
              release
            "
            href="${releaseUrl}">
            View release
          </a>

          ${actions}

        </div>

      </div>

    </article>
  `;
}


function showError() {

  loadingState.hidden =
    true;

  workContent.hidden =
    true;

  errorState.hidden =
    false;
}


async function init() {

  const params =
    new URLSearchParams(
      window.location.search
    );

  const mbid = (
    params.get("id")
    || ""
  ).toLowerCase();


  if (
    !/^[0-9a-f-]{36}$/
      .test(
        mbid
      )
  ) {
    showError();
    return;
  }


  try {

    const url =
      (
        "/data/works/"
        + mbid.slice(
            0,
            2
          )
        + "/"
        + mbid
        + ".json"
      );


    const response =
      await fetch(
        url,
        {
          cache:
            "no-store"
        }
      );


    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`
      );
    }


    const work =
      await response.json();


    document.title =
      (
        work.title
        + " — Jewish Music Timeline"
      );


    workTitle.textContent =
      work.title;


    workStats.innerHTML = `
      <span class="work-stat">
        ${escapeHtml(
          work.recording_count
        )}
        recorded version${
          work.recording_count
          === 1
            ? ""
            : "s"
        }
      </span>

      <span class="work-stat">
        ${escapeHtml(
          work.artist_count
        )}
        credited artist${
          work.artist_count
          === 1
            ? ""
            : "s"
        }
      </span>
    `;


    musicbrainzLink.href =
      work.musicbrainz_url;


    const versions =
      work.versions || [];


    versionCount.textContent =
      (
        versions.length
        + " version"
        + (
          versions.length
          === 1
            ? ""
            : "s"
        )
      );


    versionGrid.innerHTML =
      versions
        .map(
          versionHtml
        )
        .join("");


    loadingState.hidden =
      true;

    errorState.hidden =
      true;

    workContent.hidden =
      false;

  }
  catch (error) {

    console.error(
      error
    );

    showError();
  }
}


init();
