(() => {

  "use strict";


  const searchInput =
    document.getElementById(
      "searchInput"
    );

  const songSection =
    document.getElementById(
      "songSection"
    );

  const songResults =
    document.getElementById(
      "songResults"
    );

  const songCount =
    document.getElementById(
      "songCount"
    );

  const emptyState =
    document.getElementById(
      "emptyState"
    );


  if (
    !searchInput
    || !songSection
    || !songResults
    || !songCount
  ) {
    return;
  }


  let works = [];

  let timer = null;


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


  function normalize(value) {

    return String(
      value ?? ""
    )
      .normalize(
        "NFKD"
      )
      .replace(
        /\p{M}+/gu,
        ""
      )
      .toLocaleLowerCase()
      .replace(
        /[^\p{L}\p{N}]+/gu,
        " "
      )
      .trim()
      .replace(
        /\s+/g,
        " "
      );
  }


  function score(
    work,
    query
  ) {

    const title =
      normalize(
        work.title
      );

    const terms =
      Array.isArray(
        work.terms
      )
        ? work.terms
        : [];


    if (
      title === query
    ) {
      return 1000;
    }


    if (
      terms.includes(
        query
      )
    ) {
      return 950;
    }


    if (
      title.startsWith(
        query
      )
    ) {
      return 900;
    }


    if (
      terms.some(
        value =>
          value.startsWith(
            query
          )
      )
    ) {
      return 850;
    }


    if (
      title.includes(
        query
      )
    ) {
      return 800;
    }


    if (
      terms.some(
        value =>
          value.includes(
            query
          )
      )
    ) {
      return 750;
    }


    const tokens =
      query
        .split(" ")
        .filter(
          Boolean
        );


    if (
      tokens.length > 1
      &&
      tokens.every(
        token =>
          terms.some(
            value =>
              value.includes(
                token
              )
          )
      )
    ) {
      return 650;
    }


    return 0;
  }


  function workHtml(work) {

    const versions =
      Number(
        work.recording_count
        || 0
      );

    const artists =
      Number(
        work.artist_count
        || 0
      );


    return `
      <a
        class="song-search-result"
        href="/work/?id=${encodeURIComponent(
          work.mbid
        )}"
      >

        <span
          class="song-search-icon"
          aria-hidden="true">
          ♪
        </span>

        <span class="song-search-body">

          <strong
            class="song-search-title"
            dir="auto">
            ${escapeHtml(
              work.title
            )}
          </strong>

          <span class="song-search-meta">
            ${versions}
            recorded version${
              versions === 1
                ? ""
                : "s"
            }
            ·
            ${artists}
            artist${
              artists === 1
                ? ""
                : "s"
            }
          </span>

        </span>

        <span
          class="song-search-arrow"
          aria-hidden="true">
          ›
        </span>

      </a>
    `;
  }



  function updateResultSummary(
    songTotal
  ) {

    const info =
      document.getElementById(
        "resultInfo"
      );


    if (!info) {
      return;
    }


    const current =
      String(
        info.textContent
        || ""
      );


    const match =
      current.match(
        /(\d+)\s+artists?\s+·\s+(\d+)\s+releases?/i
      );


    if (!match) {
      return;
    }


    const artistTotal =
      Number(
        match[1]
      );

    const releaseTotal =
      Number(
        match[2]
      );


    const parts = [];


    if (songTotal > 0) {

      parts.push(
        `${songTotal} song${
          songTotal === 1
            ? ""
            : "s"
        }`
      );
    }


    if (artistTotal > 0) {

      parts.push(
        `${artistTotal} artist${
          artistTotal === 1
            ? ""
            : "s"
        }`
      );
    }


    if (releaseTotal > 0) {

      parts.push(
        `${releaseTotal} release${
          releaseTotal === 1
            ? ""
            : "s"
        }`
      );
    }


    info.textContent =
      parts.join(
        " · "
      );
  }


  function render() {

    const params =
      new URLSearchParams(
        window.location.search
      );


    if (
      params.get(
        "artist"
      )
    ) {
      songSection.hidden =
        true;

      return;
    }


    const query =
      normalize(
        searchInput.value
      );


    if (!query) {

      songSection.hidden =
        true;

      songResults.innerHTML =
        "";

      songCount.textContent =
        "";

      return;
    }


    const matches =
      works
        .map(
          work => ({
            work,
            score:
              score(
                work,
                query
              )
          })
        )
        .filter(
          item =>
            item.score > 0
        )
        .sort(
          (a, b) =>
            b.score
            - a.score
            ||
            b.work.recording_count
            - a.work.recording_count
            ||
            String(
              a.work.title
            ).localeCompare(
              String(
                b.work.title
              )
            )
        );


    const visible =
      matches.slice(
        0,
        60
      );


    songResults.innerHTML =
      visible
        .map(
          item =>
            workHtml(
              item.work
            )
        )
        .join("");


    songCount.textContent =
      matches.length > 60
        ? (
          "60 of "
          + matches.length
        )
        : String(
            matches.length
          );


    songSection.hidden =
      matches.length === 0;


    updateResultSummary(
      matches.length
    );


    if (
      matches.length > 0
      && emptyState
    ) {
      emptyState.hidden =
        true;
    }
  }


  async function init() {

    try {

      const response =
        await fetch(
          "/data/works/index.json",
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


      const data =
        await response.json();


      works =
        data.works || [];


      render();

      setTimeout(
        render,
        300
      );

    }
    catch (error) {

      console.error(
        "Song search unavailable:",
        error
      );
    }
  }


  searchInput.addEventListener(
    "input",
    () => {

      clearTimeout(
        timer
      );


      timer =
        setTimeout(
          render,
          100
        );
    }
  );


  init();

})();
