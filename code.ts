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
  if (msg.type === "ping") {
    figma.notify("Pong!", { timeout: 2000 });

    // const frame = figma.createFrame();
    // frame.layoutMode = "HORIZONTAL";
    // frame.primaryAxisSizingMode = "AUTO";
    // frame.counterAxisSizingMode = "AUTO";
    // frame.itemSpacing = 8;

    // const importComponentByKey = await figma.importComponentByKeyAsync(
    //   "b7baaae989913b05e57c9d2238d7d5c3a7e336a7"
    // );
    // const label1 = importComponentByKey.createInstance();
    // label1.setProperties({
    //   "text#18973:0": "bug",
    //   "backgroundColor#eb6d71ff": "#eb6d71ff",
    // });
    // frame.appendChild(label1);
    // const label2 = importComponentByKey.createInstance();
    // label2.setProperties({
    //   "text#18973:0": "impact: high",
    //   "backgroundColor#eb6d71ff": "#eb6d71ff",
    // });
    // frame.appendChild(label2);
  }

  if (msg.type === "get-component-details") {
    const currentSelectedComponent = figma.currentPage.selection[0] as
      | InstanceNode
      | ComponentNode;
    if (currentSelectedComponent.type === "INSTANCE") {
      const parentComponent =
        await currentSelectedComponent.getMainComponentAsync();
      const key = parentComponent?.key;
      figma.ui.postMessage({
        type: "parsed-response",
        message: {
          key: key,
          properties: currentSelectedComponent.componentProperties,
        },
      });
    }
    if (currentSelectedComponent.type === "COMPONENT") {
      figma.notify(
        "This is the main component. Please select an instance to view properties",
        {
          timeout: 2000,
          error: true,
        }
      );
    }
  }

  if (msg.type === "generate-ai") {
    figma.notify("Submitted!", { timeout: 2000 }); // this is how you show an alert/toast inside the figma the UI
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "ft:gpt-3.5-turbo-1106:loveland-org::9VQzhodb",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You are a world class assistant to a user who needs you to help them. The user will give you a certain prompt and you will do as they say.
              You will never respond with anything other than the response JSON.
		You will respond with an object that matches this schema: { result: { title: string, description: string, author: string, labels: string } }
    Author should be a randomised quirky GitHub handle.
            Labels shouldn't be too specific, make them relevant to the title and description. Things like severity, status, etc. Don't use a bug label.
            The labels string should be code that will generate the Figma components. This will be run in an eval function.

            You will generate the required code to create something in Figma using the plugin api which we will then eval() and run. you will add your results to the labels string. Never close the plugin. Also, Figma is available, no need to import it. End the function with a notify of what you did.
            First make a horizontally stacking frame, with 8px horizontal gap, and then using appendChild, create between 2 and 6 labels.
            Labels are an imported component, imported like "const importComponentByKey = await figma.importComponentByKeyAsync('b7baaae989913b05e57c9d2238d7d5c3a7e336a7');const instance = importComponentByKey.createInstance();"
            Make the label text something relevant to the title and description. Text is always set on the text#18973:0 property. Never change the text property name. Properties are set like: instance.setProperties("text#18973:0": "text label here");
            Give the label a fill color. This is done via label1.fills[]. If relevant make the color appropriate to the label. For example, a severe label could be red, or a easy/good-first-issue label could be green, if not sure, just make it a random color. Keep the colors quite light, don't make them too dark.
            Don't render comments in the eval text, this breaks it.
    `,
          },
          { role: "user", content: msg.prompt },
        ],
        temperature: 0.4,
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

const do_something_with_response = (data: any) => {
  // ADD YOUR FIGMA FUNCTIONS HERE
  // const nodesInSelection = figma.currentPage.selection;
  // const titleNodes = getSpecificLayersFromSelection(
  //   nodesInSelection,
  //   "__title"
  // ) as TextNode[];
  // const descriptionNodes = getSpecificLayersFromSelection(
  //   nodesInSelection,
  //   "__description"
  // ) as TextNode[];
  // const authorNodes = getSpecificLayersFromSelection(
  //   nodesInSelection,
  //   "__author"
  // ) as TextNode[];
  // replaceTextOfNodes(titleNodes, data.title);
  // replaceTextOfNodes(descriptionNodes, data.description);
  // replaceTextOfNodes(authorNodes, data.author);
  // createLabels(data.labels);

  try {
    eval(
      `(async () => {
        ${data.labels}
      })();`
    );
  } catch (error) {
    console.error(error);
  }
};

const createLabels = async (labels: string[]) => {
  const labelKey = "b7baaae989913b05e57c9d2238d7d5c3a7e336a7";
  // for each label, import the component.
  for (const label of labels) {
    try {
      const component = await figma.importComponentByKeyAsync(labelKey);
      const instance = component.createInstance();
      // component.name = label;
      instance.x = 100;
      instance.y = 100;
      // console log the instance properties
      console.log(instance.componentProperties);
      instance.setProperties({ "text#18973:0": label });
      // instance.color;
    } catch (error) {
      console.error(error);
    }
  }
  // instance.setProperties({ variant: 'primary', size:'medium' })})();`
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
