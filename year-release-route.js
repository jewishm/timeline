(() => {
  "use strict";

  /*
   * The Year browser historically linked release
   * artwork/title directly to MusicBrainz.
   *
   * Route normal clicks through JMT's own Release
   * page so users can see the tracklist and normal
   * JMT release details.
   */

  document.addEventListener(
    "click",
    event => {

      const link =
        event.target.closest(
          ".release-main-link,"
          + ".release-title-link"
        );


      if (!link) {
        return;
      }


      const match =
        String(
          link.href || ""
        ).match(
          /\/release-group\/([0-9a-f-]{36})/i
        );


      if (!match) {
        return;
      }


      event.preventDefault();


      location.href =
        "/release/?id="
        + encodeURIComponent(
            match[1]
        );
    },
    true
  );

})();
