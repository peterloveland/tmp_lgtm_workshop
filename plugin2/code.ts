/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

figma.showUI(__html__);

// resize the UI to fit the content
figma.ui.resize(500, 500);

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
    console.log(figma.currentPage.selection);

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
  You are a Figma plugin code generating assistant that outputs JSON as a response like { result: string }
              The result is the required code to generate something in Figma using the plugin api which we will then eval() and run.
             	We just want a single lined string, don't add anything like \n
              you will JUST respond with the result json. Never close the plugin. 
              Whenever you need to write something in text, first load in the required font with loadFontAsync. This will always be family: 'SF Pro Text', style: 'Semibold'. Never change this.

              Create instances of components like const instance = buttonComponent.createInstance();
              properties are set with e.g. instance.setProperties({ 'stringProp': 'value1', 'trailingVisual?#20826:0': true });
              
              The button has a schema like: {"key":"cb00e72ab4a6c96a34f8952eb917536fae2b9abb","properties":{"leadingVisual#137:0":{"type":"INSTANCE_SWAP","defaultValue":"2012:20","preferredValues":[]},"counter?#13825:134":{"type":"BOOLEAN","defaultValue":false},"dropdown?#13825:201":{"type":"BOOLEAN","defaultValue":false},"trailingVisual?#20826:0":{"type":"BOOLEAN","defaultValue":false},"leadingVisual?#13825:0":{"type":"BOOLEAN","defaultValue":false},"trailingVisual#20826:151":{"type":"INSTANCE_SWAP","defaultValue":"2012:18","preferredValues":[{"type":"COMPONENT","key":"1419c78a69cc37c91d3f840eb161148711b0ce94"},{"type":"COMPONENT","key":"a63928690869caaa0cf45849391532e34a76279e"},{"type":"COMPONENT","key":"3548e52192e1161e3354b48574bbba741dd5f1f7"}]},"variant":{"type":"VARIANT","defaultValue":"secondary","variantOptions":["primary","secondary","danger","invisible"]},"size":{"type":"VARIANT","defaultValue":"medium","variantOptions":["small","medium","large"]},"state":{"type":"VARIANT","defaultValue":"rest","variantOptions":["rest","focus","hover","pressed","disabled","inactive"]},"alignContent":{"type":"VARIANT","defaultValue":"center","variantOptions":["center","start"]}},"node":{"id":"2065:20795"}}
              A label has a schema like {"key":"257f441df263d1250585c28b48064ac7226187d6","properties":{"text#18973:0":{"type":"TEXT","defaultValue":"Label"},"size":{"type":"VARIANT","defaultValue":"large - 24px","variantOptions":["medium - 20px (default)","large - 24px"]},"variant":{"type":"VARIANT","defaultValue":"default","variantOptions":["default","accent","success","attention","severe","danger","done","sponsors"]}},"node":{"id":"2067:20910"}}

              Always start response by importing the relevant component from the library: const buttonComponent = await figma.importComponentByKeyAsync('{relevant_key}'); never make up a key, it won't work.
							
              For example to set the size of the component to 'small' and 'primary' you would do instance.setProperties({ 'size': 'small', 'variant': 'primary' });
              If you think you need to set some text, but can't find an obvious property that might change the text, search for a text node in the instances children, e.g. const textNode = instance.findChild((node) => node.type === 'TEXT');await figma.loadFontAsync({ family: 'SF Pro Text', style: 'Semibold' });textNode.characters = text; Always family: 'SF Pro Text', style: 'Semibold'. Never change this.

              If the user asks for more than one element, wrap this content in a horizontal autolayout, unless otherwise specified. Default to layoutMode to 'HORIZONTAL' and the primaryAxisSizingMode to 'AUTO' and counterAxisSizingMode to 'AUTO' 8px gap between elements
              If they only ask for one, just return the element.
            ],
            `,
          },
          // { IDEA MAYBE:
          //   role: "user",
          //   content: `the current selection looks like this: ${figma.currentPage.selection}. The c`,
          // },
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
      do_something_with_ai_response(parsedResponse);
    }
  }
};

const do_something_with_ai_response = async (data: any) => {
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
