(() => {
  "use strict";


  const MBID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;


  const SECTION_NAMES = {
    artist: "artists",
    release: "release_groups",
    work: "works",
  };


  const WIKIPEDIA_ORDER = [
    {
      site: "enwiki",
      language: "en",
    },
    {
      site: "hewiki",
      language: "he",
    },
    {
      site: "yiwiki",
      language: "yi",
    },
  ];


  function pageContext() {

    const match =
      location.pathname.match(
        /^\/(artist|release|work)(?:\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}))?\/?(?:index\.html)?$/i
      );


    if (!match) {
      return null;
    }


    const kind =
      match[1].toLowerCase();


    const queryMbid =
      new URLSearchParams(
        location.search
      ).get("id");


    const mbid = (
      queryMbid
      || match[2]
      || ""
    ).toLowerCase();


    if (!MBID_RE.test(mbid)) {
      return null;
    }


    return {
      kind,
      mbid,
      section:
        SECTION_NAMES[kind],
    };
  }


  async function fetchJson(
    url,
    timeoutMs = 4000
  ) {

    const controller =
      new AbortController();


    const timer =
      setTimeout(
        () =>
          controller.abort(),
        timeoutMs
      );


    try {

      const response =
        await fetch(
          url,
          {
            cache: "no-store",
            signal:
              controller.signal,
          }
        );


      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}`
        );
      }


      return await response.json();
    }
    finally {

      clearTimeout(
        timer
      );
    }
  }


  async function getQid(
    context
  ) {

    const data =
      await fetchJson(
        "/data/wikidata.json"
      );


    const section =
      data?.[
        context.section
      ];


    if (
      !section
      || typeof section
        !== "object"
    ) {
      return null;
    }


    const qid =
      section[
        context.mbid
      ];


    if (
      typeof qid !== "string"
      || !/^Q[0-9]+$/.test(qid)
    ) {
      return null;
    }


    return qid;
  }


  async function getSitelinks(
    qid
  ) {

    const url =
      new URL(
        "https://www.wikidata.org/w/api.php"
      );


    url.searchParams.set(
      "action",
      "wbgetentities"
    );

    url.searchParams.set(
      "ids",
      qid
    );

    url.searchParams.set(
      "props",
      "sitelinks"
    );

    url.searchParams.set(
      "sitefilter",
      WIKIPEDIA_ORDER
        .map(
          item =>
            item.site
        )
        .join("|")
    );

    url.searchParams.set(
      "format",
      "json"
    );

    url.searchParams.set(
      "origin",
      "*"
    );


    const data =
      await fetchJson(
        url
      );


    const entity =
      data?.entities?.[qid];


    if (!entity) {
      return [];
    }


    const sitelinks =
      entity.sitelinks
      || {};


    return WIKIPEDIA_ORDER
      .map(item => {

        const sitelink =
          sitelinks[
            item.site
          ];


        if (
          !sitelink?.title
        ) {
          return null;
        }


        return {
          language:
            item.language,

          title:
            sitelink.title,
        };
      })
      .filter(Boolean);
  }


  function isDisambiguation(
    page
  ) {

    return (
      page?.pageprops
      && Object.prototype
        .hasOwnProperty.call(
          page.pageprops,
          "disambiguation"
        )
    );
  }


  function compactText(
    value,
    maxLength = 260
  ) {

    const text =
      String(
        value || ""
      )
        .replace(
          /\s+/g,
          " "
        )
        .trim();


    if (
      text.length
      <= maxLength
    ) {
      return text;
    }


    const shortened =
      text.slice(
        0,
        maxLength + 1
      );


    const lastSpace =
      shortened.lastIndexOf(
        " "
      );


    const cut =
      lastSpace > 250
        ? shortened.slice(
            0,
            lastSpace
          )
        : text.slice(
            0,
            maxLength
          );


    return (
      cut.trim()
      + "…"
    );
  }


  async function wikipediaIntro(
    language,
    title
  ) {

    const url =
      new URL(
        `https://${language}.wikipedia.org/w/api.php`
      );


    url.searchParams.set(
      "action",
      "query"
    );

    url.searchParams.set(
      "prop",
      "extracts|info|pageprops"
    );

    url.searchParams.set(
      "exintro",
      "1"
    );

    url.searchParams.set(
      "explaintext",
      "1"
    );

    url.searchParams.set(
      "redirects",
      "1"
    );

    url.searchParams.set(
      "inprop",
      "url"
    );

    url.searchParams.set(
      "titles",
      title
    );

    url.searchParams.set(
      "format",
      "json"
    );

    url.searchParams.set(
      "formatversion",
      "2"
    );

    url.searchParams.set(
      "origin",
      "*"
    );


    const data =
      await fetchJson(
        url
      );


    const page =
      data?.query?.pages?.[0];


    if (
      !page
      || page.missing
      || isDisambiguation(page)
    ) {
      return null;
    }


    const extract =
      String(
        page.extract || ""
      );


    const firstParagraph =
      extract
        .split(/\n+/)
        .map(
          value =>
            value.trim()
        )
        .find(Boolean);


    if (
      !firstParagraph
      || firstParagraph.length
        < 30
    ) {
      return null;
    }


    let articleUrl =
      page.fullurl;


    if (!articleUrl) {

      articleUrl =
        `https://${language}.wikipedia.org/wiki/`
        + encodeURIComponent(
            title.replace(
              / /g,
              "_"
            )
          );
    }


    return {
      language,
      text:
        compactText(
          firstParagraph
        ),
      url:
        articleUrl,
    };
  }


  async function getWikipedia(
    qid
  ) {

    const sitelinks =
      await getSitelinks(
        qid
      );


    for (
      const sitelink
      of sitelinks
    ) {

      try {

        const result =
          await wikipediaIntro(
            sitelink.language,
            sitelink.title
          );


        if (result) {
          return result;
        }
      }
      catch (_) {

        // Try the next language.
      }
    }


    return null;
  }


  function installStyles() {

    if (
      document.getElementById(
        "jmtWikipediaAboutStyles"
      )
    ) {
      return;
    }


    const style =
      document.createElement(
        "style"
      );


    style.id =
      "jmtWikipediaAboutStyles";


    style.textContent = `
      .jmt-wikipedia-about {
        margin: 18px 0 0;
        max-width: 760px;
      }

      .jmt-wikipedia-about-title {
        margin: 0 0 6px;
        font-size: .78rem;
        font-weight: 700;
        letter-spacing: .065em;
        text-transform: uppercase;
        opacity: .72;
      }

      .jmt-wikipedia-about-text {
        margin: 0;
        line-height: 1.48;
        font-size: .92rem;
        opacity: .9;

        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 3;
        overflow: hidden;
      }

      .jmt-wikipedia-about-link {
        display: inline-block;
        margin-top: 6px;
        color: #d7ae68;
        font-size: .84rem;
        text-decoration: none;
      }

      .jmt-wikipedia-about-link:hover,
      .jmt-wikipedia-about-link:focus-visible {
        text-decoration: underline;
        text-underline-offset: 3px;
      }
    `;


    document.head.appendChild(
      style
    );
  }


  function createBlock(
    result
  ) {

    installStyles();


    const section =
      document.createElement(
        "section"
      );


    section.className =
      "jmt-wikipedia-about";

    section.dataset
      .jmtWikipediaAbout =
        "1";


    const title =
      document.createElement(
        "div"
      );


    title.className =
      "jmt-wikipedia-about-title";

    title.textContent =
      "About";


    const paragraph =
      document.createElement(
        "p"
      );


    paragraph.className =
      "jmt-wikipedia-about-text";

    paragraph.dir =
      "auto";

    paragraph.lang =
      result.language;

    paragraph.textContent =
      result.text;


    const link =
      document.createElement(
        "a"
      );


    link.className =
      "jmt-wikipedia-about-link";

    link.href =
      result.url;

    link.target =
      "_blank";

    link.rel =
      "noopener";

    link.textContent =
      "From Wikipedia ↗";


    section.append(
      title,
      paragraph,
      link
    );


    return section;
  }


  function entityAliasElement(
    kind
  ) {

    const labels = {
      artist:
        /^Artist alternate names$/i,

      release:
        /^Release alternate names$/i,

      work:
        /^Work alternate names$/i,
    };


    const matcher =
      labels[kind];


    if (!matcher) {
      return null;
    }


    return [
      ...document.querySelectorAll(
        "main details.seo-aliases"
      )
    ].find(details => {

      const summary =
        details.querySelector(
          "summary"
        );


      return matcher.test(
        summary?.textContent
          ?.trim()
        || ""
      );
    }) || null;
  }


  function staticSeoAnchor(
    kind
  ) {

    if (kind === "artist") {

      const card =
        document.querySelector(
          "main .seo-card"
        );


      const actions =
        card?.querySelector(
          ".seo-actions"
        );


      if (actions) {

        return {
          target:
            actions,

          position:
            "before",
        };
      }
    }


    if (kind === "work") {

      const headings = [
        ...document.querySelectorAll(
          "main h2, main h3"
        )
      ];

      const appearances =
        headings.find(
          heading =>
            /appearances on the timeline/i.test(
              heading.textContent || ""
            )
        );


      if (appearances) {

        const section =
          appearances.closest(
            "section"
          );


        return {
          target:
            section || appearances,

          position:
            "before",
        };
      }
    }


    const aliases =
      entityAliasElement(
        kind
      );


    if (aliases) {

      return {
        target:
          aliases,

        position:
          "after",
      };
    }


    const main =
      document.querySelector(
        "main"
      );


    const h1 =
      main?.querySelector(
        "h1"
      );


    if (
      !main
      || !h1
    ) {
      return null;
    }


    let top =
      h1;


    while (
      top.parentElement
      && top.parentElement
        !== main
    ) {

      top =
        top.parentElement;
    }


    return {
      target:
        top,

      position:
        "after",
    };
  }


  function insertionPoint(
    kind
  ) {

    if (
      document.querySelector(
        "[data-jmt-wikipedia-about]"
      )
    ) {
      return null;
    }


    if (
      kind === "artist"
    ) {

      const hero =
        document.querySelector(
          ".artist-hero"
        );


      if (hero) {

        return {
          target:
            hero,

          position:
            "after",
        };
      }
    }


    if (
      kind === "work"
    ) {

      const hero =
        document.querySelector(
          ".work-hero"
        );


      if (
        hero
        && !hero.closest(
          "[hidden]"
        )
      ) {

        return {
          target:
            hero,

          position:
            "after",
        };
      }
    }


    if (
      kind === "release"
    ) {

      const date =
        document.querySelector(
          ".standalone-info .standalone-date"
        );


      if (date) {

        return {
          target:
            date,

          position:
            "after",
        };
      }
    }


    return staticSeoAnchor(
      kind
    );
  }


  async function insertWhenReady(
    kind,
    result
  ) {

    const block =
      createBlock(
        result
      );


    for (
      let attempt = 0;
      attempt < 60;
      attempt++
    ) {

      const point =
        insertionPoint(
          kind
        );


      if (point) {

        if (
          point.position
          === "after"
        ) {

          point.target
            .insertAdjacentElement(
              "afterend",
              block
            );
        }
        else if (
          point.position
          === "before"
        ) {

          point.target
            .insertAdjacentElement(
              "beforebegin",
              block
            );
        }


        return;
      }


      await new Promise(
        resolve =>
          setTimeout(
            resolve,
            100
          )
      );
    }
  }


  async function init() {

    const context =
      pageContext();


    if (!context) {
      return;
    }


    try {

      const qid =
        await getQid(
          context
        );


      if (!qid) {
        return;
      }


      const wikipedia =
        await getWikipedia(
          qid
        );


      if (
        !wikipedia
        || typeof wikipedia.text
          !== "string"
        || !wikipedia.text.trim()
      ) {
        return;
      }


      await insertWhenReady(
        context.kind,
        wikipedia
      );
    }
    catch (_) {

      // Deliberately silent.
      //
      // No Wikidata relationship,
      // no Wikipedia article,
      // an API failure,
      // a timeout,
      // CORS trouble, etc.
      //
      // In every case the normal JMT page
      // simply remains unchanged.
    }
  }


  init();
})();
