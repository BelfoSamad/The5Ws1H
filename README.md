<img src="docs/5ws1h.png" alt="5Ws1H" width="100%"/>
**5Ws1H** is a method used in journalism and investigations to summarize stories by answering six key questions: What, Who, Why, When, Where, and How. This approach helps reporters and investigators quickly get to the heart of a story, covering all the essential details in a clear and simple way.

# Features

- [x] Summarize Article with 5Ws1H technique.
- [x] Translate received summary in a handful of language (In-Device)
- [x] Simple Direct text summary of the article (In-Device)
- [x] Get information of People and Places with WikiPedia
- [x] Summarized articles history
- [ ] Ask question about the article (using RAG - _Coming Soon_)

# Architecture

**The5Ws1H** is a Chrome Extension designed to help you quickly extract the key facts from any article. It uses LLM powered by **Gemini** to extract the six key questions and the new **Chrome** build-in AI capabilities to provide in-device experience.

## The Extension

Represents the front end of the project, catches the active tab's newly updated URL and sends it to the agent to summarize (when requested by the user). The extension is structured as follow:

- `background.js`: The core of the extension which handles the observation of the status of Tabs and the currently active Tab. It saves the relevent summaries in memory to save resources and provide a fast experience to the user. It communicates with the `offscreen.js`, `content script` and the `sidepanel` to handle the summarization process.
- `offscreen.js`: Due to it having access to DOM without interrupting the user's experience. It communicates with **Firebase** (Authentication, Firestore and Functions) to provide the basic backend capabilities, and provides access to built-in AI capabilities (Summarization, Translation).
- `content script`: Mainly to show the loading animation and retrieve the `textContent` of the article page to be used for the built-in Summarization capabilities.
- `sidepanel`: the front end of the extension, built with Angular and handles the user's input (for Authentication - Login/Register), shows the summary of the article when requested by the user and the list of summarized articles.

## The Agent

Built with Genkit. It receives the URL of the article, gets the `textContent` and summarize it with the 5Ws1H technique using **Gemini**. The agent is deployed to Firebase Functions and can be easily called from the extension.

## Firebase

A Serverless backend which handles all of the Authentication (Register and Login), Function calling to communicate with the agent and Firestore (Database) which saves summaries of articles. This database is used for future summarizations so the extension would first check if the article URL exists on the database then calls the _Agent_ to summarize the article and save the result. This would make the extension auto-populate the database which first, saves token costs and second, builds a database that can be used for other projects later.

# How to Run it

## Agent

First you need to have a **Firebase Project** and enable _Authentication_ and _Firestore_.

```
    - go to Project Settings > Service accounts
    - Click on "Generate new private key"
    - Rename the genrated key to "firebase-creds.json"
    - Copy/Paste the key file into "agent/functions"
    - Make sure to update the "project-id" on "agent/functions/src/index.ts"
```

Then you need to provide the **Gemini's API Key**.

```
    - Create a ".env" file on "agent/functions"
    - Add the Gemini API Key: "GENAI_API_KEY=<your gemini api key, you can generate in https:://aistudio.google.com>"
    - Make sure the API Key is added to "Firebase Functions", use "firebase functions:secrets:set GEMINI_API_KEY" and paste the API Key and click enter (text will be hidden, just paste and click enter)
```

You can check the project before deploying, first set `debug = true` then run the command line `npm run genkit`. To deploy the project, first make sure that `debug = false` then run the command line (on "/agent") `firebase deploy`.
Check [Genkit official documentations](https://firebase.google.com/docs/genkit) for more information.

## Extension

Assuming you have already created and setup a **Firebase Project** for the Agent. Create a **Web Application** and copy the `firebaseConfig` constant and put it in a new file called `firebase_configs.js`.

```typescript
// put this in a new file called firebase_configs.js
// while setting up the Web App (on Firebase), you will find this constant ready, just copy paste it (and make sure the name is correct)
export const firebaseConfig = {
  apiKey: "<your api key>",
  authDomain: "<your authDomain>",
  projectId: "<your projectId>",
  storageBucket: "<your storageBucket>",
  messagingSenderId: "<your messagingSenderId>",
  appId: "<your app id>",
  measurementId: "<your measurementId>",
};
```

You can build the extension using the **Bash Script** defined as `build.sh`. Just run the command line `sh build.sh` then you can find the built extension on `extension/dist`.

## Built-In Capabilities

> [!WARNING]
> Gemini Nano for Chrome is still in experimental and only running from **Chrome 131** to **Chrome 136**.
> For Translation API, you will need: Version 131.0.6778.2 or above.
> For Summarization API, you will need: Version 129.0.6639.0 or above.
> preferrably use [Chrome Canary](https://www.google.com/chrome/canary/)

Check these documentations for: [Summarization API](https://docs.google.com/document/d/1Bvd6cU9VIEb7kHTAOCtmmHNAYlIZdeNmV7Oy-2CtimA/edit?tab=t.0) and [Translation API](https://docs.google.com/document/d/1bzpeKk4k26KfjtR-_d9OuXLMpJdRMiLZAOVNMuFIejk/edit?tab=t.0) To properly setup your Chrome to be able to use the In-Device capabilities.

# Problems and Future Plans

- [ ] The built-in AI capabilities (Summarization, Translation) are still in Beta
  - The process is too slow (especially for summarization) in addition to the time taken by the Agent. (Currently based on the current flow)
  - The exception `The model attempted to output text in an untested language, and was prevented from doing so` is thrown frequently
- [ ] **Ask the article** functionality exists but the process is unconvenient that the feature is removed
  - The article has to be indexed so the user can ask questions about it, but auto-indexing the article can be a waste of resources since the user might not want to ask questions (indexing is necessary for RAG implmentation)
  - The article might not be enough to answer the user's questins - a solution would be to fetch for related articles to add more context
- [ ] The plan is to move fully into in-device capabilities. Awaiting the **Prompt API** to be able to generate structured outputs. The **Summarization API** can be used to make the article slower then passed into **Prompt API** to generate the summary.
