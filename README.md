# Atlas Promotional Products AI Assistant

A conversational AI assistant for promotional products dealers using Google Genkit. The system helps dealers quickly find products, generate mockups, and create client presentations through natural conversation.

Built with the [Genkit Library](https://github.com/firebase/genkit) and Google AI to provide superior semantic understanding and multi-turn conversation capabilities for the promotional products industry.

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

## Features

### Core Capabilities
- **Semantic Understanding**: Separates product entities from display preferences and actions
- **Multi-Turn Conversations**: Maintains context across conversation turns and handles interruptions
- **Intent Classification**: Distinguishes between product search, specification inquiry, budget discussion, and timeline planning
- **Ambiguity Detection**: Identifies when queries contain multiple possible interpretations
- **Smart Clarification**: Generates intelligent follow-up questions to resolve ambiguities
- **Industry Context**: Adapts interpretation based on client industry and use case patterns

### Business Workflow Support
- **Product Discovery**: Natural language product search with context understanding
- **Requirements Gathering**: Multi-turn conversation to clarify client needs
- **Mockup Generation**: Apply client logos to selected products (planned)
- **Presentation Creation**: Generate professional client presentations (planned)

### Technical Architecture
- **Flow-Based Design**: Each business process is a dedicated Genkit flow
- **Context Management**: Maintains conversation state and user preferences
- **Error Handling**: Graceful conversation repair and redirection
- **Extensible**: Built for easy integration with promotional product APIs

## Quick Start

### Example Interactions

```typescript
// Example 1: Display preference separation ✅
User: "show me bags with images"
Atlas: Understands user wants bags AND wants to see images
// Not searching for "bags images"

// Example 2: Complex ambiguity resolution ✅  
User: "Corporate gifts under $20"
Atlas: "I'd like to clarify - is that $20 per gift or $20 total budget? 
        And who are these gifts for - clients, employees, or prospects?"

// Example 3: Industry context intelligence ✅
User: "Premium quality polo shirts for our tech startup"  
Atlas: Interprets "premium" in tech industry context
// Recommends high-tech, modern, sleek designs at medium-high budget
```

## System Components

### 🧠 Core Intelligence
- **Intent Analysis Engine**: 8-step pipeline for understanding user requirements
- **Context Intelligence**: Industry, event, and recipient pattern recognition
- **Ambiguity Detection**: 7 types of ambiguity with confidence scoring
- **Business Intelligence**: Strategic recommendations and insights

### 🔄 Conversation Management  
- **Multi-Turn Context**: Maintains conversation state across interactions
- **Smart Clarification**: Generates contextually appropriate questions
- **Conversation Repair**: Handles misunderstandings gracefully
- **Learning System**: Adapts based on interaction patterns

### 📊 Quality Assurance
- **Confidence Scoring**: Real-time assessment of understanding accuracy
- **Success Metrics**: Tracks conversation quality and resolution rates
- **Proactive Detection**: Identifies potential issues before they escalate

## Documentation

- **[Technical Documentation](./ATLAS_DOCUMENTATION.md)**: Complete system architecture and capabilities
- **[API Reference](./API_REFERENCE.md)**: Detailed flow and schema documentation  
- **[Deployment Guide](./DEPLOYMENT_GUIDE.md)**: Production deployment and scaling
- **[Test Examples](./src/test-examples.ts)**: Comprehensive test scenarios and validation

## Dependencies

*   genkit: ^1.0.4
*   @genkit-ai/googleai: ^1.0.4

## Dev Dependencies

*   genkit-cli: ^1.0.4
*   tsx: ^4.19.2
*   typescript: ^5.6.3
