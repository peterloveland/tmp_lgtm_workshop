// This file holds the main code for our plugin. This file is where we make  a call to the OpenAI API
// and then do something with the response in the figma document.
// We can have access to the figma document via the figma global object. (e.g. figma.currentPage.selection)

figma.showUI(__html__);

// ****************************************************************************************************************************************
// THIS IS WHERE WE LISTEN FOR MESSAGES FROM THE UI AND THEN DO SOMETHING WITH THEM
figma.ui.onmessage = async  (msg: {type: string, prompt: string}) => {
  
  if (msg.type === 'ping') { // we listen for the message type 'ping!'
    sendMessageToUI('set_loading', {isLoading: true}); // we use sendMessageToUI to send a message to the UI. We listen for these events in ui.html
    notifyInFigma('Ping!'); // this is how you show an alert/toast inside the figma the UI
    setTimeout(() => {
      sendMessageToUI('pong');
      sendMessageToUI('set_loading', {isLoading: false});
    }, 2000);

  }

  if (msg.type === 'generate-ai') {
    sendMessageToUI('set_loading', {isLoading: true });
    const OPENAI_API_KEY = ''; // replace with your actual API key

    const selectionCount = figma.currentPage.selection.length;
    const allAppliedFilles = getAppliedColorOfNodes();

    console.log("all applied fills", allAppliedFilles)
    console.log({selectionCount})

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
            content: `You are a world class assistant to a user who needs you to help them. The user will give you a certain prompt and you will do as they say. You will never respond with anything other than the response JSON, an array of length ${selectionCount}. You will respond in an object that contains matches this schema: { result: 'string'[] }. Even if you are returning 0 or 1 result, always. Never provide fewer results in the array than the ${selectionCount}`
          },
          { role: 'user', content: msg.prompt }
        ]
      })
    });

    const data = await response.json();
    console.log("Data is", data)
    if (data.error || !data.choices.length) {
      console.error(data || 'No response from OpenAI API')
      notifyInFigma('Error: No response from OpenAI API');
    } else {
      const parsedResponse = parseOpenAIResponse(data);
      DO_SOMETHING_WITH_RESPONSE(parsedResponse);
    }
  }
  sendMessageToUI('set_loading', {isLoading: false });
}


// ****************************************************************************************************************************************
// THIS IS WHERE YOU CAN WRITE YOUR FUNCTION THAT WILL TAKE THE RESPONSE FROM OPENAI (WHICH IS AN ARRAY) AND DO SOMETHING WITH IT IN FIGMA
// view the helper functions below to see how you can interact with the figma document

const DO_SOMETHING_WITH_RESPONSE = (response:[]) => {
  notifyInFigma(`Received ${response.length} responses from OpenAI: ${JSON.stringify(response)}`); // this is how you show a message in the UI
  replaceMultipleNodesText(response);
  return response;
}





//   _    _          _                            __                          _     _                       
//  | |  | |        | |                          / _|                        | |   (_)                      
//  | |__| |   ___  | |  _ __     ___   _ __    | |_   _   _   _ __     ___  | |_   _    ___    _ __    ___ 
//  |  __  |  / _ \ | | | '_ \   / _ \ | '__|   |  _| | | | | | '_ \   / __| | __| | |  / _ \  | '_ \  / __|
//  | |  | | |  __/ | | | |_) | |  __/ | |      | |   | |_| | | | | | | (__  | |_  | | | (_) | | | | | \__ \
//  |_|  |_|  \___| |_| | .__/   \___| |_|      |_|    \__,_| |_| |_|  \___|  \__| |_|  \___/  |_| |_| |___/
//                      | |                                                                                 
//                      |_|                                                                                 

// These are small functions we've written to help you interact with the figma document. You can use them in your code above.

  // this is a snippet to get the color of the selected nodes
  function getAppliedColorOfNodes() {
    const nodes = figma.currentPage.selection as TextNode[]
    return nodes.map(node => 'fills' in node && node.fills);
  }

  // this is a snippet to get the text of the selected nodes
  function getAllTextCharactersOfNodes() {
    const nodes = figma.currentPage.selection as TextNode[]
    return nodes.map(node => node.characters);
  }

  // this is a snippet to replace the text of the selected nodes
  async function replaceMultipleNodesText(textArray: string[]) {
    const nodes = figma.currentPage.selection as TextNode[]
    //@ts-expect-error expecting
    console.log("selection is", figma.currentPage.selection.map(node => node.characters))
    console.log("Nodes are", nodes.map(node => node.characters))
    nodes.forEach(async (node, index) => {
      console.log("replacing", node.characters, "with", textArray[index])
      await replaceTextOfNode(node, textArray[index]);
    });
  }

  // change variable of 

  async function replaceTextOfNode(node: TextNode, newText: string) {
    await figma.loadFontAsync(node.fontName as FontName);
    node.characters = newText;
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

const parseOpenAIResponse = (response) => {
  const content = response.choices[0].message.content;
  const parsedResponse = JSON.parse(content).result;
  return parsedResponse;
}

const sendMessageToUI = (type:string, message: any = {}) => {
  figma.ui.postMessage({type: type, message});
}

const notifyInFigma = (message: string, timeout: number = 2000) => {
  figma.notify(message, {timeout: timeout});
}