const OPENAI_API_KEY = "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";

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
figma.showUI(__html__);

// resize the UI to fit the content
figma.ui.resize(500, 500);

figma.ui.onmessage = async (msg: { type: string; prompt: string }) => {
  if (msg.type === "analyse-design" || msg.type === "describe-design") {
    figma.ui.postMessage({ isLoading: true });
    const selection = figma.currentPage.selection;
    // Check if something is selected
    if (selection.length > 0) {
      try {
        // Export the first selected node as a PNG
        const bytes = await selection[0].exportAsync({
          format: "PNG",
          constraint: { type: "SCALE", value: 1 },
        });

        // Convert bytes to base64
        const base64Image = figma.base64Encode(bytes);
        const imageDataUrl = `data:image/png;base64,${base64Image}`;

        // Send request to OpenAI API
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
                  role: "system",
                  content: `
You are a Figma plugin code generating assistant that outputs JSON as a response like { result: string }
The result is the required code to generate something in Figma using the plugin api which we will then eval() and run.
We just want a single lined string, don't add anything like \n
You will JUST respond with the result json. Never close the plugin. 
Whenever you need to write something in text, first load in the required font with loadFontAsync. This will always be family: 'SF Pro Text', style: 'Semibold'. Never change this.

Create instances of components like const instance = buttonComponent.createInstance();
Properties are set with e.g. instance.setProperties({ 'stringProp': 'value1', 'trailingVisual?#20826:0': true });

If you need to import components, *always* start response by importing the relevant component from the library: const buttonComponent = await figma.importComponentByKeyAsync('{relevant_key}'); never make up a key, it won't work.
Also *always& import Inter like: await figma.loadFontAsync({ family: "Inter", style: "Regular" });

							
For example to set the size of the component to 'small' and 'primary' you would do instance.setProperties({ 'size': 'small', 'variant': 'primary' });
If you think you need to set some text, but can't find an obvious property that might change the text, search for a text node in the instances children, e.g. const textNode = instance.findChild((node) => node.type === 'TEXT');await figma.loadFontAsync({ family: 'SF Pro Text', style: 'Semibold' });textNode.characters = text; Always family: 'SF Pro Text', style: 'Semibold'. Never change this.

If the user asks for more than one element, wrap this content in a horizontal autolayout, unless otherwise specified. Default to layoutMode to 'HORIZONTAL' and the primaryAxisSizingMode to 'AUTO' and counterAxisSizingMode to 'AUTO' 8px gap between elements
If they only ask for one, just return the element.
If the user needs a button always infer the text of the button from the user prompt. Infer appropriate button variant based of that.

Make this a wireframe, use basic shapes and text, and just gray colors. No need to be pixel perfect.
                  `,
                },
                {
                  role: "user",
                  content: [
                    {
                      type: "text",
                      text:
                        msg.type === "analyse-design"
                          ? "You are a helpful and polite UI reviewing bot, make some suggestions about this design. They could be things to think about, like concerns about implementation. Or they could be suggestions of thigns to try. Use good UX/UI/accessibility practices. Add the response to a JSON object, { result: { review: string, recreateInstructions: string } }."
                          : "Describe what you see and make a prediction about what this design is for, be very descriptive. Add the response to a JSON object, { result: { review: string, recreateInstructions: string } }.",
                    },
                    {
                      type: "text",
                      text: "We want to rebuild this in Figma, we will run commands in eval(). Provide instructions to recreate this in a string.",
                    },
                    {
                      type: "image_url",
                      image_url: {
                        url: imageDataUrl,
                      },
                    },
                  ],
                },
              ],
            }),
          }
        );

        const data = await response.json();
        if (data.error || !data.choices.length) {
          console.error(data || "No response from OpenAI API");
          if (data.error.message.includes("API key")) {
            figma.notify("Did you add the API key?", {
              error: true,
              timeout: 2000,
            });
            figma.ui.postMessage({ isLoading: false });
          } else {
            figma.notify("Error: No response from OpenAI API", {
              error: true,
              timeout: 2000,
            });
            figma.ui.postMessage({ isLoading: false });
          }
        } else {
          const parsedResponse = parseOpenAIResponse(data);
          console.log(parsedResponse.recreateInstructions);
          // try {
          //   eval(`
          //     (async () => {
          //       ${parsedResponse.recreateInstructions} // if we can solve the 'expected ;' error, this should be able to recreate the design
          //     })()`);
          // } catch (error) {
          //   console.error(error);
          // }
          figma.ui.postMessage({
            type: "parsed-response",
            message: parsedResponse,
          });
          figma.ui.postMessage({ isLoading: false });
        }
      } catch (error) {
        console.error(error);
      }
    } else {
      console.log("No nodes selected");
      figma.notify("Select a node to export", {
        timeout: 2000,
      });
      figma.ui.postMessage({ isLoading: false });
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

const parseOpenAIResponse = (response: any) => {
  console.log("running  parseOpenAIResponse");
  console.log(response);
  const content = response.choices[0].message.content;
  const parsedResponse = JSON.parse(content).result;
  return parsedResponse;
};
