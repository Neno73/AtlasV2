# js-character-generator

A simple Genkit app to generate fantasy characters.

This is a simple demonstration web app using the [Genkit Library](https://github.com/firebase/genkit) with Gemini to generate characters for an adventure game.

## Prerequisites

*   Node.js and npm installed.
*   A Google AI API key.

## Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/Neno73/AtlasV2.git
    ```
2.  Navigate to the project directory:
    ```bash
    cd AtlasV2
    ```
3.  Install the dependencies:
    ```bash
    npm install
    ```

## Configuration

1.  In IDX, get a Gemini API key at https://g.co/ai/idxGetGeminiKey.
2.  Enter the API key in the `.idx/dev.nix` file.
3.  Rebuild the environment.

## Usage

1.  To build the project, run:
    ```bash
    npm run build
    ```
2.  To start the Genkit development server, run:
    ```bash
    npm run genkit:dev
    ```
3.  After starting the server, open a new terminal (`Ctrl` + `\``) and follow the link to the "Genkit Developer UI" to use Genkit's built-in local developer playground.

## Dependencies

*   genkit: ^1.0.4
*   @genkit-ai/googleai: ^1.0.4

## Dev Dependencies

*   genkit-cli: ^1.0.4
*   tsx: ^4.19.2
*   typescript: ^5.6.3
