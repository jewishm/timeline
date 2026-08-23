(() => {

  function absoluteUrl(path) {

    return new URL(
      path,
      window.location.origin
    ).href;
  }


  function artistUrl(mbid) {

    return absoluteUrl(
      `/artist/?id=${encodeURIComponent(
        mbid
      )}`
    );
  }


  function releaseUrl(mbid) {

    return absoluteUrl(
      `/release/?id=${encodeURIComponent(
        mbid
      )}`
    );
  }


  function showToast(message) {

    let toast =
      document.getElementById(
        "jmtShareToast"
      );


    if (!toast) {

      toast =
        document.createElement(
          "div"
        );

      toast.id =
        "jmtShareToast";

      toast.className =
        "share-toast";

      document.body.appendChild(
        toast
      );
    }


    toast.textContent =
      message;


    toast.classList.add(
      "show"
    );


    clearTimeout(
      showToast.timer
    );


    showToast.timer =
      setTimeout(
        () => {
          toast.classList.remove(
            "show"
          );
        },
        1600
      );
  }


  async function copyText(text) {

    if (
      window.isSecureContext
      && navigator.clipboard
    ) {

      await navigator.clipboard.writeText(
        text
      );

      return true;
    }


    const textarea =
      document.createElement(
        "textarea"
      );

    textarea.value =
      text;

    textarea.setAttribute(
      "readonly",
      ""
    );

    textarea.style.position =
      "fixed";

    textarea.style.left =
      "-9999px";

    textarea.style.top =
      "0";

    document.body.appendChild(
      textarea
    );

    textarea.focus();
    textarea.select();


    let copied = false;

    try {

      copied =
        document.execCommand(
          "copy"
        );

    }
    catch (error) {

      console.warn(
        "execCommand copy failed",
        error
      );
    }


    textarea.remove();


    return copied;
  }


  function closeFallback() {

    document
      .getElementById(
        "jmtShareFallback"
      )
      ?.remove();
  }


  function fallbackSheet({
    title,
    text,
    url,
  }) {

    closeFallback();


    const backdrop =
      document.createElement(
        "div"
      );


    backdrop.id =
      "jmtShareFallback";

    backdrop.className =
      "share-fallback-backdrop";


    backdrop.innerHTML = `
      <div
        class="share-fallback-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Share">

        <div class="share-fallback-handle">
        </div>


        <div class="share-fallback-heading">

          <strong>
            Share
          </strong>

          <button
            class="share-fallback-close"
            type="button"
            aria-label="Close">
            ×
          </button>

        </div>


        <div
          class="share-fallback-title"
          dir="auto">
          ${escapeForHtml(
            title || ""
          )}
        </div>


        <button
          class="share-fallback-action"
          data-copy-link
          type="button">

          <span class="share-fallback-icon">
            ⧉
          </span>

          <span>
            Copy link
          </span>

        </button>


        <a
          class="share-fallback-action"
          href="${escapeForHtml(url)}">

          <span class="share-fallback-icon">
            ↗
          </span>

          <span>
            Open release page
          </span>

        </a>

      </div>
    `;


    document.body.appendChild(
      backdrop
    );


    backdrop
      .querySelector(
        ".share-fallback-close"
      )
      .addEventListener(
        "click",
        closeFallback
      );


    backdrop.addEventListener(
      "click",
      event => {

        if (
          event.target === backdrop
        ) {
          closeFallback();
        }

      }
    );


    backdrop
      .querySelector(
        "[data-copy-link]"
      )
      .addEventListener(
        "click",
        async () => {

          const copied =
            await copyText(
              url
            );


          if (copied) {

            closeFallback();

            showToast(
              "Link copied"
            );

            return;
          }


          /*
           * Last-resort fallback for older /
           * restricted browsers.
           */
          window.prompt(
            "Copy this link:",
            url
          );

        }
      );
  }


  function escapeForHtml(value) {

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


  async function share({
    title,
    text,
    url,
  }) {

    const payload = {
      title:
        title
        || "Jewish Music Timeline",

      text:
        text || "",

      url,
    };


    /*
     * Native share only works reliably
     * in a secure context.
     */
    if (
      window.isSecureContext
      && typeof navigator.share
        === "function"
    ) {

      try {

        await navigator.share(
          payload
        );

        return true;

      }
      catch (error) {

        if (
          error?.name
          === "AbortError"
        ) {
          return false;
        }


        console.warn(
          "Native share failed",
          error
        );
      }

    }


    /*
     * Local HTTP preview or unsupported browser:
     * show an explicit fallback rather than
     * silently doing nothing.
     */
    fallbackSheet(
      payload
    );

    return false;
  }


  window.JMTShare = {
    share,
    artistUrl,
    releaseUrl,
    showToast,
  };

})();
