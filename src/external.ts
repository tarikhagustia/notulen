// @ts-nocheck

export function whenSubtitleOn() {
  var script = [];
  var last_speaker = "";
  // DOM element containing all subtitles
  const subtitleDiv = document.querySelector("div[jsname='dsyhDe']");
  const subtitleObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      // Skip ts rules
      /* @ts-ignore */
      if (
        mutation.target.classList &&
        mutation.target.classList.contains("iTTPOb")
      ) {
        if (mutation.addedNodes.length) {
          var newNodes = mutation.addedNodes;
          var speaker =
            newNodes["0"]?.parentNode?.parentNode?.parentNode?.querySelector(
              ".zs7s8d.jxFHg"
            )?.textContent;
          var imgUrl =
            newNodes["0"]?.parentNode?.parentNode?.parentNode?.querySelector(
              ".KpxDtd.r6DyN"
            )?.src;
          if (speaker) {
            setTimeout(function () {
              if (newNodes.length) {
                var transribe = {
                  speaker: {
                    name: speaker,
                    profilePicture: imgUrl,
                  },
                  text: "",
                  date: Date.now(),
                };
                if (last_speaker != speaker) {
                  /* @ts-ignore */
                  //   script.push(
                  //     speaker + " : " + newNodes["0"].innerText + "\r\n"
                  //   );
                  transribe.text = newNodes["0"].innerText + "\r\n";
                  script.push(transribe);
                  last_speaker = speaker;
                } else {
                  // Find the last record from script and update the text
                  script[script.length - 1].text +=
                    newNodes["0"].innerText + "\r\n";
                }

                setTransribe(script, last_speaker);
              }
            }, 7000);
          }
        }
      }
    });
  });

  // Start observing subtitle div
  subtitleObserver.observe(subtitleDiv, {
    childList: true,
    subtree: true,
    attributes: false,
    characterData: false,
  });
}
