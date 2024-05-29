const OPENAI_API_KEY = ''; // replace with your actual API key
/* eslint-disable @typescript-eslint/no-unused-vars */

// This file holds the main code for our plugin. This file is where we make  a call to the OpenAI API
// and then do something with the response in the figma document.
// We can have access to the figma document via the figma global object. (e.g. figma.currentPage.selection)

figma.showUI(__html__);

// resize the UI to fit the content
figma.ui.resize(300, 500)

// ****************************************************************************************************************************************
// THIS IS WHERE WE LISTEN FOR MESSAGES FROM THE UI AND THEN DO SOMETHING WITH THEM
figma.ui.onmessage = async  (msg: {type: string, prompt: string}) => {
  
  if (msg.type === '') { // we listen for the message type 'ping!'
    notifyInFigma('Ping!'); // this is how you show an alert/toast inside the figma the UI
    setTimeout(() => {
      sendMessageToUI('pong');
    }, 2000);
    
  }
  
  if (msg.type === 'generate-ai') {
    sendMessageToUI('set_loading', {isLoading: true });
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      // https://platform.openai.com/docs/guides/text-generation/chat-completions-api
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        response_format: {'type':'json_object'},
        messages: [
          {
            role: 'system',
            content: `
              You are a world class assistant to a user who needs you to help them. The user will give you a certain prompt and you will do as they say.
              You will never respond with anything other than the response JSON.
              You will respond in an object that contains matches this schema: { result: { title: string } }
            `,
          },
          { role: 'user', content: "Generate content for a design conference talk" }
        ]
      })
    });

    const data = await response.json();
    if (data.error || !data.choices.length) {
      console.error(data || 'No response from OpenAI API')
      notifyInFigma('Error: No response from OpenAI API');
    } else {
      sendMessageToUI('parsed_response', data);
      DO_SOMETHING_WITH_RESPONSE(data);
    }
  }
  sendMessageToUI('set_loading', {isLoading: false });
}



// ****************************************************************************************************************************************
// THIS IS WHERE YOU CAN WRITE YOUR FUNCTION THAT WILL TAKE THE RESPONSE FROM OPENAI (WHICH IS AN ARRAY) AND DO SOMETHING WITH IT IN FIGMA
// view the helper functions below to see how you can interact with the figma document

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DO_SOMETHING_WITH_RESPONSE = (response: any) => {
  
}





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
    const nodes = figma.currentPage.selection as TextNode[]
    return nodes.map(node => 'fills' in node && node.fills);
  }

  // this is a snippet to get the text of the selected nodes
  function getAllTextCharactersOfNodes() {
    const nodes = figma.currentPage.selection as TextNode[]
    return nodes.map(node => node.characters);
  }

  // this is a snippet to replace the text of the selected nodes
  async function replaceText(nodes: TextNode[], text: string) {
    nodes.forEach(async (node) => {
      await replaceTextOfNode(node, text);
    });
  }

  // This is a snippet to change the variant of a component.
  // You might want to make your component in Figma from scratch, make it simple with easy naming.
  // This snippet won't handle nested instances.
  // propName is the name of the property you want to change, propValue is the value you want to change it to.
  async function changeVariantOfComponent(node: InstanceNode, propName: string, propValue: string) {
      if (node.type === 'INSTANCE') {
        try {
            node.setProperties({
              [propName]: propValue
            })
        } catch (error) {
          console.error(error);
        } 
        
      } else {
        notifyInFigma('Please select a component');
      }
  }


  // This is a simple way to get started, change the text of a node.
  async function replaceTextOfNode(node: TextNode, newText: string) {
    await figma.loadFontAsync(node.fontName as FontName);
    node.characters = newText;
  }

  // snippet to change the fill of a node
  // you could ask OpenAI to give you a color and then use this function to change the fill of a node.
  // Could be used to set Labels? Severity? Status? etc.
  // Sample usage: changeFillOfNode(titleNode as TextNode, {r: 107, g: 185, b: 123});
  async function changeFillOfNode(node: TextNode | FrameNode | InstanceNode, color: {r: number, g: number, b: number}) {
    const r = color.r / 255;
    const g = color.g / 255;
    const b = color.b / 255;
    if ( node.type === 'TEXT') { // to-do: add support for other node types
      node.setRangeFills(0, node.characters.length, [{type: 'SOLID', color: {r, g, b}}]);
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
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sendMessageToUI = (type:string, message: any = {}) => {
  figma.ui.postMessage({type: type, message});
}

const notifyInFigma = (message: string, timeout: number = 2000) => {
  figma.notify(message, {timeout: timeout});
}

const getLayerFromSelectionWithTitle = (title: string) => {
  return figma.currentPage.selection.find(node => node.name === title);
}