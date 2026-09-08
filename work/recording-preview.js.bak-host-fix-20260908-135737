(() => {

  "use strict";


  let activeAudio = null;
  let activeButton = null;
  let activeCard = null;
  let progressTimer = null;

  let callbackCounter = 0;

  const previewCache =
    new WeakMap();

  const unavailable =
    new WeakSet();


  function appleInfo(
    rawUrl
  ) {

    try {

      const url =
        new URL(
          rawUrl
        );


      const parts =
        url.pathname
          .split("/")
          .filter(Boolean);


      let id =
        url.searchParams.get(
          "i"
        );


      if (!id) {

        const match =
          url.pathname.match(
            /\/song\/(?:[^/]+\/)?(\d+)\/?$/i
          )
          ||
          url.pathname.match(
            /\/(\d+)\/?$/
          );


        if (match) {

          id =
            match[1];

        }

      }


      if (
        !id
        ||
        !/^\d+$/.test(
          id
        )
      ) {

        return null;

      }


      const country =
        (
          parts.length
          &&
          /^[a-z]{2}$/i.test(
            parts[0]
          )
        )
          ? parts[0].toLowerCase()
          : "us";


      return {
        id,
        country,
      };

    }
    catch {

      return null;

    }

  }


  function deezerId(
    rawUrl
  ) {

    try {

      const url =
        new URL(
          rawUrl
        );


      const match =
        url.pathname.match(
          /\/track\/(\d+)/i
        );


      return (
        match
          ? match[1]
          : null
      );

    }
    catch {

      return null;

    }

  }


  function jsonp(
    url,
    extraParameters = ""
  ) {

    return new Promise(
      (
        resolve,
        reject
      ) => {

        const callback =
          (
            "__jmt_preview_"
            + Date.now()
            + "_"
            + (
                callbackCounter++
              )
          );


        const script =
          document.createElement(
            "script"
          );


        let complete =
          false;


        const cleanup =
          () => {

            if (complete) {

              return;

            }


            complete =
              true;


            clearTimeout(
              timer
            );


            script.remove();


            try {

              delete window[
                callback
              ];

            }
            catch {

              window[
                callback
              ] = undefined;

            }

          };


        window[
          callback
        ] =
          data => {

            cleanup();

            resolve(
              data
            );

          };


        script.onerror =
          () => {

            cleanup();

            reject(
              new Error(
                "Preview lookup failed"
              )
            );

          };


        const separator =
          url.includes("?")
            ? "&"
            : "?";


        script.src =
          (
            url
            + separator
            + extraParameters
            + (
                extraParameters
                  ? "&"
                  : ""
              )
            + "callback="
            + encodeURIComponent(
                callback
              )
          );


        const timer =
          setTimeout(
            () => {

              cleanup();

              reject(
                new Error(
                  "Preview lookup timed out"
                )
              );

            },
            10000
          );


        document.head.appendChild(
          script
        );

      }
    );

  }


  function exactLinks(
    card
  ) {

    let apple = null;
    let deezer = null;


    for (
      const anchor
      of card.querySelectorAll(
        ".version-buttons a[href]"
      )
    ) {

      const href =
        anchor.href
        || "";


      if (
        !apple
        &&
        appleInfo(
          href
        )
      ) {

        apple =
          href;

      }


      if (
        !deezer
        &&
        deezerId(
          href
        )
      ) {

        deezer =
          href;

      }

    }


    return {
      apple,
      deezer,
    };

  }


  async function applePreview(
    rawUrl
  ) {

    const info =
      appleInfo(
        rawUrl
      );


    if (!info) {

      return null;

    }


    const endpoint =
      (
        "https://itunes.apple.com/lookup"
        + "?id="
        + encodeURIComponent(
            info.id
          )
        + "&country="
        + encodeURIComponent(
            info.country
          )
        + "&entity=song"
      );


    try {

      const data =
        await jsonp(
          endpoint
        );


      const exact =
        (
          data?.results
          || []
        ).find(
          item =>
            String(
              item.trackId
              || ""
            )
            === info.id
            &&
            item.previewUrl
        );


      return (
        exact?.previewUrl
        || null
      );

    }
    catch {

      return null;

    }

  }


  async function deezerPreview(
    rawUrl
  ) {

    const id =
      deezerId(
        rawUrl
      );


    if (!id) {

      return null;

    }


    try {

      const data =
        await jsonp(
          (
            "https://api.deezer.com/track/"
            + encodeURIComponent(
                id
              )
          ),
          "output=jsonp"
        );


      if (
        data?.error
      ) {

        return null;

      }


      return (
        data?.preview
        || null
      );

    }
    catch {

      return null;

    }

  }


  async function resolvePreview(
    card
  ) {

    if (
      previewCache.has(
        card
      )
    ) {

      return previewCache.get(
        card
      );

    }


    if (
      unavailable.has(
        card
      )
    ) {

      return null;

    }


    const links =
      exactLinks(
        card
      );


    /*
     * Apple first because its URL relationship
     * gives us an exact Apple song ID.
     */
    if (
      links.apple
    ) {

      const preview =
        await applePreview(
          links.apple
        );


      if (preview) {

        previewCache.set(
          card,
          preview
        );


        return preview;

      }

    }


    /*
     * Exact Deezer recording relationship is
     * the fallback. Still no fuzzy matching.
     */
    if (
      links.deezer
    ) {

      const preview =
        await deezerPreview(
          links.deezer
        );


      if (preview) {

        previewCache.set(
          card,
          preview
        );


        return preview;

      }

    }


    unavailable.add(
      card
    );


    return null;

  }


  function stopCurrent() {

    if (
      activeAudio
    ) {

      activeAudio.pause();

      activeAudio.src =
        "";

      activeAudio =
        null;

    }


    clearInterval(
      progressTimer
    );


    progressTimer =
      null;


    if (
      activeCard
    ) {

      activeCard.classList.remove(
        "preview-playing"
      );


      const bar =
        activeCard.querySelector(
          ".version-preview-progress-bar"
        );


      if (
        bar
      ) {

        bar.style.width =
          "0%";

      }

    }


    if (
      activeButton
    ) {

      activeButton.textContent =
        "▶";


      activeButton.title =
        "Play 30-second preview";


      activeButton.setAttribute(
        "aria-label",
        "Play 30-second preview"
      );

    }


    activeButton =
      null;

    activeCard =
      null;

  }


  function play(
    card,
    button,
    previewUrl
  ) {

    if (
      activeCard
      === card
    ) {

      stopCurrent();

      return;

    }


    stopCurrent();


    const audio =
      new Audio(
        previewUrl
      );


    audio.volume =
      0.8;


    activeAudio =
      audio;

    activeCard =
      card;

    activeButton =
      button;


    card.classList.add(
      "preview-playing"
    );


    button.textContent =
      "Ⅱ";


    button.title =
      "Stop preview";


    button.setAttribute(
      "aria-label",
      "Stop preview"
    );


    const bar =
      card.querySelector(
        ".version-preview-progress-bar"
      );


    progressTimer =
      setInterval(
        () => {

          if (
            !bar
            ||
            !audio.duration
          ) {

            return;

          }


          bar.style.width =
            (
              (
                audio.currentTime
                /
                audio.duration
              )
              * 100
            )
            + "%";

        },
        250
      );


    audio.addEventListener(
      "ended",
      stopCurrent,
      {
        once: true
      }
    );


    audio.addEventListener(
      "error",
      stopCurrent,
      {
        once: true
      }
    );


    audio.play()
      .catch(
        stopCurrent
      );

  }


  async function buttonClick(
    card,
    button
  ) {

    if (
      activeCard
      === card
    ) {

      stopCurrent();

      return;

    }


    button.disabled =
      true;


    button.classList.add(
      "preview-loading"
    );


    button.textContent =
      "…";


    const previewUrl =
      await resolvePreview(
        card
      );


    button.disabled =
      false;


    button.classList.remove(
      "preview-loading"
    );


    if (
      !previewUrl
    ) {

      button.textContent =
        "×";


      button.title =
        "Preview unavailable";


      button.setAttribute(
        "aria-label",
        "Preview unavailable"
      );


      setTimeout(
        () => {

          button.remove();

        },
        1200
      );


      return;

    }


    play(
      card,
      button,
      previewUrl
    );

  }


  function enhanceCard(
    card
  ) {

    if (
      card.dataset
        .exactPreviewEnhanced
      === "1"
    ) {

      return;

    }


    const links =
      exactLinks(
        card
      );


    /*
     * Album URLs do not qualify here.
     * appleInfo requires /song/,
     * deezerId requires /track/.
     */
    if (
      !links.apple
      &&
      !links.deezer
    ) {

      return;

    }


    const art =
      card.querySelector(
        ".version-art"
      );


    if (
      !art
    ) {

      return;

    }


    const shell =
      document.createElement(
        "div"
      );


    shell.className =
      "version-art-shell";


    art.parentNode.insertBefore(
      shell,
      art
    );


    shell.appendChild(
      art
    );


    const button =
      document.createElement(
        "button"
      );


    button.type =
      "button";


    button.className =
      "version-preview-button";


    button.textContent =
      "▶";


    button.title =
      "Play 30-second preview";


    button.setAttribute(
      "aria-label",
      "Play 30-second preview"
    );


    button.addEventListener(
      "click",
      event => {

        event.preventDefault();

        event.stopPropagation();


        buttonClick(
          card,
          button
        );

      }
    );


    shell.appendChild(
      button
    );


    const progress =
      document.createElement(
        "div"
      );


    progress.className =
      "version-preview-progress";


    const progressBar =
      document.createElement(
        "div"
      );


    progressBar.className =
      "version-preview-progress-bar";


    progress.appendChild(
      progressBar
    );


    shell.appendChild(
      progress
    );


    card.dataset
      .exactPreviewEnhanced =
        "1";

  }


  function scan() {

    document
      .querySelectorAll(
        ".version-card"
      )
      .forEach(
        enhanceCard
      );

  }


  const grid =
    document.getElementById(
      "versionGrid"
    );


  if (
    grid
  ) {

    const observer =
      new MutationObserver(
        scan
      );


    observer.observe(
      grid,
      {
        childList: true,
        subtree: true,
      }
    );

  }


  scan();

})();
