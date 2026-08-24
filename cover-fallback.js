(() => {

  const cachedCoverPattern =
    /^\/covers\/([0-9a-f-]{36})--(\d+)\.webp$/i;


  function fallbackFor(url) {

    try {

      const parsed =
        new URL(
          url,
          window.location.href
        );


      const match =
        parsed.pathname.match(
          cachedCoverPattern
        );


      if (!match) {
        return null;
      }


      return (
        "https://coverartarchive.org/"
        + `release/${match[1]}/`
        + `${match[2]}.jpg`
      );

    }
    catch {
      return null;
    }

  }


  document.addEventListener(
    "error",
    event => {

      const image =
        event.target;


      if (
        !(image instanceof HTMLImageElement)
      ) {
        return;
      }


      if (
        image.dataset
          .jmtCaaFallbackTried
      ) {
        return;
      }


      const fallback =
        fallbackFor(
          image.currentSrc
          || image.src
        );


      if (!fallback) {
        return;
      }


      image.dataset
        .jmtCaaFallbackTried = "1";


      console.warn(
        "Cached cover unavailable; "
        + "falling back to Cover Art Archive.",
        image.src
      );


      image.src =
        fallback;

    },
    true
  );

})();
