// This plugin will open a window to prompt the user to enter a number, and
// it will then create that many rectangles on the screen.

// This file holds the main code for plugins. Code in this file has access to
// the *figma document* via the figma global object.
// You can access browser APIs in the <script> tag inside "ui.html" which has a
// full browser environment (See https://www.figma.com/plugin-docs/how-plugins-run).

// This shows the HTML page in "ui.html".
figma.showUI(__html__);

figma.ui.onmessage = async  (msg: {type: string, prompt: string}) => {
  
  if (msg.type === 'ping') { // we listen for the message type 'hello-lgtm!'
    figma.ui.postMessage({type: 'set_loading', isLoading: true });
    figma.notify('Ping!'); // this is how you show a message in the UI
    setTimeout(() => {
      figma.ui.postMessage({type: 'pong' });
      figma.ui.postMessage({type: 'set_loading', isLoading: false });
    }, 2000);

  }

  if (msg.type === 'generate-ai') {
    figma.ui.postMessage({type: 'set_loading', isLoading: true });
    const OPENAI_API_KEY = ''; // replace with your actual API key

    console.log("PROMPT IS", msg.prompt)

    // const currentSelection = figma.currentPage.selection;

    const selectionCount = figma.currentPage.selection.length;
    const allAppliedFilles = getAppliedColorOfNodes(figma.currentPage.selection);

    console.log("all applied fills", allAppliedFilles)

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      // https://platform.openai.com/docs/guides/text-generation/chat-completions-api
      body: JSON.stringify({
        model: 'gpt-4-turbo',
        response_format: {'type':'json_object'},
        messages: [
          {
            role: 'system',
            content: `You are a world class assistant to a user who needs you to help them. The user will give you a certain prompt and you will do as they say. You will never respond with anything other than the response JSON, an array of length ${selectionCount}. You will respond in an object that contains matches this schema: { result: 'string'[] }. Even if you are returning 0 or 1 result, always.`
          },
          { role: 'user', content: msg.prompt }
        ]
      })
    });

    const data = await response.json();
    console.log("Data is", data)
    if (data.error || !data.choices.length) {
      console.error(data || 'No response from OpenAI API')
    } else {
      const response = data.choices[0].message.content;
      const parsedResponse = JSON.parse(response);
      await replaceMultipleNodesText(figma.currentPage.selection as TextNode[], parsedResponse.result);
    }
  }
  figma.ui.postMessage({type: 'set_loading', isLoading: false });
};

function getAppliedColorOfNodes(nodes: readonly SceneNode[]) {
  return nodes.map(node => 'fills' in node && node.fills);
}

function getAllTextCharactersOfNodes(nodes: TextNode[]) {
  return nodes.map(node => node.characters);
}

async function replaceMultipleNodesText(nodes: TextNode[], textArray: string[]) {
  //@ts-expect-error expecting
  console.log("selection is", figma.currentPage.selection.map(node => node.characters))
  console.log("Nodes are", nodes.map(node => node.characters))
  nodes.forEach(async (node, index) => {
    console.log("replacing", node.characters, "with", textArray[index])
    await replaceTextOfNode(node, textArray[index]);
  });
}

async function replaceTextOfNode(node: TextNode, newText: string) {
  await figma.loadFontAsync(node.fontName as FontName);
  node.characters = newText;
}
