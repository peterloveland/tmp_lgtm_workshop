/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

figma.showUI(__html__);

// resize the UI to fit the content
figma.ui.resize(500, 500);

figma.ui.onmessage = async (msg: { type: string; prompt: string }) => {
  if (msg.type === "get-picture") {
    let imagedata;

    const selection = figma.currentPage.selection;
    // Check if something is selected
    if (selection.length > 0) {
      // Export the first selected node as a PNG
      const bytes = await selection[0].exportAsync({
        format: "PNG",
        constraint: { type: "SCALE", value: 1 },
      });

      // console.log(bytes);
      // let imageData;
      // try {
      // const exampleBytes = new Uint8Array(bytes); // "Hello" in bytes
      // const imageData = bytesToBase64(exampleBytes);
      // console.log("imageData"); // Output: SGVsbG8=

      try {
        const image64 = btoa(String.fromCharCode(...new Uint8Array(bytes)));
        console.log(image64); // Output: SGVsbG8=
        // put the image into the UI
        console.log("RUNNING");
        const response = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
              model: "gpt-4o",
              response_format: { type: "json_object" },
              messages: [
                {
                  role: "user",
                  content: [
                    { type: "text", text: "What’s in this image?" },
                    {
                      type: "image_url",
                      image_url: {
                        url: `data:image/png;base64,${image64}`,
                      },
                    },
                  ],
                },
              ],

              temperature: 0.2,
            }),
          }
        );

        console.log("RUNNING 2");
        const data = await response.json();
        if (data.error || !data.choices.length) {
          console.error(data || "No response from OpenAI API");
          figma.notify("Error: No response from OpenAI API", { timeout: 2000 });
        } else {
          const parsedResponse = parseOpenAIResponse_plugin3(data);
          figma.ui.postMessage({
            type: "parsed-response",
            message: parsedResponse,
          });
        }
        return true;
      } catch (error) {
        console.error(error);
      }
    } else {
      console.log("No nodes selected");
    }
  }
};

// ****************************************************************************************************************************************
//  __          __                 _            _                          __                          _     _
//  \ \        / /                | |          | |                        / _|                        | |   (_)
//   \ \  /\  / /    ___    _ __  | | __  ___  | |__     ___    _ __     | |_   _   _   _ __     ___  | |_   _    ___    _ __    ___
//    \ \/  \/ /    / _ \  | '__| | |/ / / __| | '_ \   / _ \  | '_ \    |  _| | | | | | '_ \   / __| | __| | |  / _ \  | '_ \  / __|
//     \  /\  /    | (_) | | |    |   <  \__ \ | | | | | (_) | | |_) |   | |   | |_| | | | | | | (__  | |_  | | | (_) | | | | | \__ \
//      \/  \/      \___/  |_|    |_|\_\ |___/ |_| |_|  \___/  | .__/    |_|    \__,_| |_| |_|  \___|  \__| |_|  \___/  |_| |_| |___/
//                                                             | |
//                                                             |_|
// These can mostly be ignored, they are just helper functions to make the code more readable and quick to write.
// Feel free to use them or modify them as you see fit.

const parseOpenAIResponse_plugin3 = (response: any) => {
  console.log("running  parseOpenAIResponse");
  const content = response.choices[0].message.content;
  const parsedResponse = JSON.parse(content).result;
  return parsedResponse;
};
