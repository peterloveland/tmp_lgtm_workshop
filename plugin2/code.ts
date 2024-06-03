const OPENAI_API_KEY = ""; // replace with your actual API key
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

// This file holds the main code for our plugin. This file is where we make  a call to the OpenAI API
// and then do something with the response in the figma document.
// We can have access to the figma document via the figma global object. (e.g. figma.currentPage.selection)

figma.showUI(__html__);

// resize the UI to fit the content
figma.ui.resize(500, 500);
// ****************************************************************************************************************************************
// THIS IS WHERE WE LISTEN FOR MESSAGES FROM THE UI AND THEN DO SOMETHING WITH THEM
figma.ui.onmessage = async (msg: { type: string; prompt: string }) => {
  if (msg.type === "create-shapes") {
    try {
      const parentFrame = figma.createFrame();
      parentFrame.name = "Look, some API generated content!";
      // auto size
      parentFrame.layoutMode = "VERTICAL";
      parentFrame.counterAxisSizingMode = "AUTO";
      parentFrame.primaryAxisSizingMode = "AUTO";
      parentFrame.itemSpacing = 10;
      parentFrame.cornerRadius = 10;
      parentFrame.x = figma.viewport.center.x;
      parentFrame.y = figma.viewport.center.y;
      // padding
      parentFrame.paddingLeft = 10;
      parentFrame.paddingRight = 10;
      parentFrame.paddingTop = 10;
      parentFrame.paddingBottom = 10;

      // add some text
      const text = figma.createText();
      text.name = "Text";
      await figma.loadFontAsync({ family: "SF Pro Text", style: "Semibold" });
      text.fontName = { family: "SF Pro Text", style: "Semibold" };
      text.characters = "Look I can generate some text!";
      text.fontSize = 14;
      text.x = 10;
      text.y = 10;

      // add a dividing rectangle
      const rect = figma.createRectangle();
      rect.name = "Rectangle";
      rect.fills = [{ type: "SOLID", color: { r: 0.8, g: 0.8, b: 0.8 } }];
      rect.cornerRadius = 5;
      rect.resize(200, 1);
      // full width
      rect.layoutAlign = "STRETCH";

      parentFrame.appendChild(text);
      parentFrame.appendChild(rect);

      // add another frame, horizontally stacked with 8px spacing
      const buttonContainer = figma.createFrame();
      buttonContainer.name = "Button container";
      buttonContainer.layoutMode = "HORIZONTAL";
      buttonContainer.counterAxisSizingMode = "AUTO";
      buttonContainer.primaryAxisSizingMode = "AUTO";
      buttonContainer.itemSpacing = 8;
      buttonContainer.fills = [];

      // First we import the component from the library, we assign the result to buttonComponentFromPrimer
      // This won't add anything to Figma, this is just setting up the component
      const buttonComponentFromPrimer = await figma.importComponentByKeyAsync(
        "cb00e72ab4a6c96a34f8952eb917536fae2b9abb"
      );
      // Then we generate an instance of that component
      // This will now add it to the Figma doc
      const cancelButton = buttonComponentFromPrimer.createInstance();

      // The primer button doesn't expose the text as a prop, so we've made a wrapper to do this for you
      setButtonText(cancelButton, "Cancel");

      // Let's do the same but with a submit button
      const submitButton = buttonComponentFromPrimer.createInstance();
      // This time we want to set the variant to be primary
      // variant is a property on the component, we can set this via the API with:
      submitButton.setProperties({ variant: "primary" });
      setButtonText(submitButton, "Submit");

      // now add these 2 buttons to the buttonContainer (the frame)
      buttonContainer.appendChild(cancelButton);
      buttonContainer.appendChild(submitButton);

      // and then add the buttonContainer to the parentFrame
      parentFrame.appendChild(buttonContainer);
    } catch (error) {
      figma.notify("Error: " + error, { timeout: 2000, error: true });
      console.error(error);
    }
    return false;
  }

  if (msg.type === "test-eval") {
    try {
      const labelComponent = await figma.importComponentByKeyAsync(
        "257f441df263d1250585c28b48064ac7226187d6"
      );
      const labels = [
        "React PR",
        "Code Review",
        "Merge Request",
        "React Update",
        "Feature Addition",
      ].map(async (text, index) => {
        const instance = labelComponent.createInstance();
        instance.setProperties({
          size: "medium - 20px (default)",
          variant: ["default", "accent", "success", "attention", "done"][index],
        });
        const textNode = instance.findChild(
          (node) => node.type === "TEXT"
        ) as TextNode;
        await figma.loadFontAsync({ family: "SF Pro Text", style: "Semibold" });
        textNode.characters = text;
        return instance;
      });
      const labelInstances = await Promise.all(labels);
      const autolayout = figma.createFrame();
      autolayout.layoutMode = "HORIZONTAL";
      autolayout.primaryAxisSizingMode = "AUTO";
      autolayout.counterAxisSizingMode = "AUTO";
      autolayout.itemSpacing = 20;
      labelInstances.forEach((label) => autolayout.appendChild(label));
      figma.currentPage.appendChild(autolayout);
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
      const parsedResponse = parseOpenAIResponse(data);
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

//   ______ _                         _          _
//  |  ____(_)                       | |        | |
//  | |__   _  __ _ _ __ ___   __ _  | |__   ___| |_ __   ___ _ __ ___
//  |  __| | |/ _` | '_ ` _ \ / _` | | '_ \ / _ \ | '_ \ / _ \ '__/ __|
//  | |    | | (_| | | | | | | (_| | | | | |  __/ | |_) |  __/ |  \__ \
//  |_|    |_|\__, |_| |_| |_|\__,_| |_| |_|\___|_| .__/ \___|_|  |___/
//             __/ |                              | |
//            |___/                               |_|

// These are small functions we've written to help you interact with the figma document. You can use them in your code above.

// FAIL
// this is a snippet to get the color of the selected nodes
function getAppliedColorOfNodes() {
  const nodes = figma.currentPage.selection as TextNode[];
  return nodes.map((node) => "fills" in node && node.fills);
}

// this is a snippet to get the text of the selected nodes
function getAllTextCharactersOfNodes() {
  const nodes = figma.currentPage.selection as TextNode[];
  return nodes.map((node) => node.characters);
}

// this is a snippet to replace the text of the selected nodes
async function replaceText(nodes: TextNode[], text: string) {
  nodes.forEach(async (node) => {
    // await replaceTextOfNode(node, text);
  });
}

// This is a snippet to change the variant of a component.
// You might want to make your component in Figma from scratch, make it simple with easy naming.
// This snippet won't handle nested instances.
// propName is the name of the property you want to change, propValue is the value you want to change it to.
async function changeVariantOfComponent(
  node: InstanceNode,
  propName: string,
  propValue: string
) {
  if (node.type === "INSTANCE") {
    try {
      node.setProperties({
        [propName]: propValue,
      });
    } catch (error) {
      console.error(error);
    }
  } else {
    figma.notify("Please select a component!", { timeout: 2000 }); // this is how you show an alert/toast inside the figma the UI
  }
}

// This is a simple way to get started, change the text of a node.
async function replaceTextOfNodes(nodes: TextNode[], newText: string) {
  // node = node as TextNode;
  for (const node of nodes) {
    await figma.loadFontAsync(node.fontName as FontName);
    node.characters = newText;
  }
}

// snippet to change the fill of a node
// you could ask OpenAI to give you a color and then use this function to change the fill of a node.
// Could be used to set Labels? Severity? Status? etc.
// Sample usage: changeFillOfNode(titleNode as TextNode, {r: 107, g: 185, b: 123});
async function changeFillOfNode(
  node: TextNode | FrameNode | InstanceNode,
  color: { r: number; g: number; b: number }
) {
  const r = color.r / 255;
  const g = color.g / 255;
  const b = color.b / 255;
  if (node.type === "TEXT") {
    // to-do: add support for other node types
    node.setRangeFills(0, node.characters.length, [
      { type: "SOLID", color: { r, g, b } },
    ]);
  }
}

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const parseOpenAIResponse = (response: any) => {
  const content = response.choices[0].message.content;

  const parsedResponse = JSON.parse(content).result;
  return parsedResponse;
};

const getSpecificLayersFromSelection = (nodes: any, title: string): any[] => {
  const result: any[] = [];
  for (const node of nodes) {
    if (node.name === title) {
      result.push(node);
    }
    if ("children" in node) {
      const childrenResult = getSpecificLayersFromSelection(
        node.children,
        title
      );
      result.push(...childrenResult);
    }
  }
  return result;
};

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

// const basicSelectionStructure = (nodes: any[]) => {
//   // loop through the current selection. We just want the node type. If the node has children recursively loop through these.
//   // the stucture should look sometihng like this:
//   // [
//   //   {type: 'frame', id: '123', children: [
//   //     {type: 'frame', id: 'ansdasd', children: [
//   //       {type: 'text', id: '12340nd'},
//   //       {type: 'rectangle', id: '12340nd'}
//   //     ]}
//   //   ]},
//   //   {type: 'circle', id: '24323'}
//   // ]

//   // for each node in nodes
//     nodes.forEach(async (node) => {
//       const doesNodeHaveChildren(node)
//     });

// };
// const doesNodeHaveChildren = (node:any) => {
//   node.children
// };
