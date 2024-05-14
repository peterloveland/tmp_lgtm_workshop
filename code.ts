// This plugin will open a window to prompt the user to enter a number, and
// it will then create that many rectangles on the screen.

// This file holds the main code for plugins. Code in this file has access to
// the *figma document* via the figma global object.
// You can access browser APIs in the <script> tag inside "ui.html" which has a
// full browser environment (See https://www.figma.com/plugin-docs/how-plugins-run).

// This shows the HTML page in "ui.html".
figma.showUI(__html__);

figma.ui.onmessage = async  (msg: {type: string, count: number}) => {
  
  if (msg.type === 'hello-lgtm!') { // we listen for the message type 'hello-lgtm!'
    figma.notify('Hello LGTM!'); // this is how you show a message in the UI
  }

    if (msg.type === 'generate-ai') {
    const OPENAI_API_KEY = ''; // replace with your actual API key

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
            content: 'You are a world class Figma helper'
          },
          // {"role": "user", "content": "Generate a GitHub issue title"}, // You can mimic previous conversations by adding more messages
          // {"role": "assistant", "content": "Error upgrading React component in LGTM repository"}, // You can mimic previous conversations by adding more messages
          {"role": "user", "content": "Generate a GitHub issue title and body for a bug report"},
          {"role": "user", "content": "The response must be in JSON format, with the structure of {title: 'string', body: 'string'}"},
        ]
      })
      
    });

    const data = await response.json();
    console.log(data);
    // figma.ui.postMessage({type: 'update-ui', message: data.choices[0].message.content});
    figma.ui.postMessage({type: 'update-ui', message: JSON.parse(data.choices[0].message.content)});
  }

  // Make sure to close the plugin when you're done. Otherwise the plugin will
  // keep running, which shows the cancel button at the bottom of the screen.
  // figma.closePlugin();
};
