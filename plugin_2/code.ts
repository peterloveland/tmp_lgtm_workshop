const OPENAI_API_KEY = "";

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

figma.showUI(__html__, { width: 500, height: 500 });

figma.ui.onmessage = async (msg: { type: string; prompt: string }) => {
  if (msg.type === "create-shapes") {
    try {
      // Lesson 4 content here
    } catch (error) {
      figma.notify("Error: " + error, { timeout: 2000, error: true });
      console.error(error);
    }
    return false;
  }

  if (msg.type === "test-eval") {
    try {
      eval(
        `(async () => { figma.notify("This is a string that's converted to JS!" )})()`
      );
    } catch (error) {
      figma.notify("Error: " + error, { timeout: 2000, error: true });
    }
  }

  if (msg.type === "get-component-details") {
    const currentSelectedComponent = figma.currentPage.selection[0];
    if (currentSelectedComponent.type === "INSTANCE") {
      const parentComponent =
        (await currentSelectedComponent.getMainComponentAsync()) as ComponentNode;
      const key = parentComponent.key;

      let props;
      try {
        // if the parent component doesn't have variants it's simple:
        props = parentComponent.componentPropertyDefinitions;
      } catch (error) {
        console.log("couldn't get property ref");
        try {
          const importedComponent = await figma.importComponentByKeyAsync(key);
          props = importedComponent.componentPropertyDefinitions;
        } catch (error) {
          try {
            const importedComponent = await figma.importComponentByKeyAsync(
              key
            );
            const componentSet = importedComponent.parent as ComponentNode;
            props = componentSet.componentPropertyDefinitions;
          } catch (error) {
            figma.notify(
              "Error. Try right clicking -> 'go to main component' and re run there",
              { error: true }
            );
          }
        }
      } finally {
        figma.ui.postMessage({
          type: "parsed-response",
          message: {
            key: key,
            properties: props,
            node: currentSelectedComponent,
          },
        });
      }
    }
    if (
      currentSelectedComponent.type === "COMPONENT" ||
      currentSelectedComponent.type === "COMPONENT_SET"
    ) {
      try {
        figma.ui.postMessage({
          type: "parsed-response",
          message: {
            properties: currentSelectedComponent.componentPropertyDefinitions,
          },
        });
      } catch (error) {
        console.log(error);
        try {
          // select figma parent
          const componentSet = currentSelectedComponent.parent as ComponentNode;
          figma.ui.postMessage({
            type: "parsed-response",
            message: {
              properties: componentSet.componentPropertyDefinitions,
            },
          });
        } catch (error) {
          figma.notify(
            "We can't find the component/component set, this looks like a variant?"
          );
        }
      }
    }
  }

  if (msg.type === "generate-ai") {
    figma.notify("Submitted!", { timeout: 200 }); // this is how you show an alert/toast inside the figma the UI
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
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

            `,
          },
          { role: "user", content: msg.prompt },
        ],
        temperature: 0.2,
      }),
    });

    const data = await response.json();
    if (data.error || !data.choices.length) {
      console.error(data || "No response from OpenAI API");
      figma.notify("Error: No response from OpenAI API", { timeout: 2000 });
    } else {
      const parsedResponse = parseOpenAIResponse_plugin2(data);
      figma.ui.postMessage({
        type: "parsed-response",
        message: parsedResponse,
      });
      do_something_with_response(parsedResponse);
    }
  }
};

const do_something_with_response = async (data: any) => {
  // ADD YOUR FIGMA FUNCTIONS HERE
  try {
    eval(`
    (async () => {
      ${data}
    })()`);
  } catch (error) {
    figma.notify("Error: " + error, { timeout: 2000, error: true });
    console.error(error);
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

const setButtonText = async (instance: InstanceNode, text: string) => {
  try {
    const textNode = instance.findChild(
      (node) => node.type === "TEXT"
    ) as TextNode;
    await figma.loadFontAsync({ family: "SF Pro Text", style: "Semibold" });
    textNode.characters = text;
  } catch (error) {
    console.error(error);
  }
};

const parseOpenAIResponse_plugin2 = (response: any) => {
  console.log("running  parseOpenAIResponse");
  const content = response.choices[0].message.content;
  const parsedResponse = JSON.parse(content).result;
  return parsedResponse;
};
