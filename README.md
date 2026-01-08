# LLM Agnostic AI Agent Architecture

A TypeScript-based, LLM agnostic AI agent architecture for e-commerce business assistance. This system provides a layered, composable approach to building conversational AI agents that can work with multiple language model providers while maintaining consistent behavior patterns.

## Features

- **LLM Provider Abstraction**: Work with OpenAI, Anthropic, Google, and other LLM providers through a unified interface
- **Structured Conversation Flows**: Consistent conversation patterns with predictable next-step actions
- **Dynamic Tool Registry**: Flexible system for adding business capabilities without modifying core logic
- **Context Management**: Persistent conversation state and user context across sessions
- **Recommendation Engine**: Structured business recommendations with unique IDs and tracking
- **Business Data Integration**: Support for multiple marketplace integrations (Shopify, Amazon, eBay, etc.)
- **UI Integration**: Seamless control of user interface elements through agent commands
- **Property-Based Testing**: Comprehensive testing with formal correctness properties

## Architecture

The system follows a three-layer architecture:

1. **Application Layer**: User interfaces, API gateways, and high-level business logic
2. **Orchestration Layer**: Agent core, flow routing, context management, and recommendation engine
3. **Infrastructure Layer**: LLM abstraction, tool registry, data services, and UI controller

## Getting Started

### Prerequisites

- Node.js 18+ 
- TypeScript 5+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd llm-agnostic-ai-agent

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Run with coverage
npm run test:coverage

# Start development server
npm run dev
```

### Development

```bash
# Run tests in watch mode
npm run test:watch

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

## Project Structure

```
src/
├── types/           # TypeScript type definitions
├── interfaces/      # Core interfaces for all layers
├── config/          # Configuration management
├── utils/           # Utility functions
├── test/            # Test setup and generators
└── index.ts         # Main entry point
```

## Testing

The project uses a dual testing approach:

- **Unit Tests**: Jest for specific examples, edge cases, and integration points
- **Property-Based Tests**: fast-check for universal properties across all inputs

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- --testPathPattern=types

# Run with coverage
npm run test:coverage

# Run property-based tests with specific seed
FC_SEED=12345 npm test
```

## Configuration

The system supports environment-specific configurations. See `src/config/index.ts` for available options.

## Contributing

1. Follow the existing code style and patterns
2. Write both unit tests and property-based tests for new functionality
3. Ensure all tests pass before submitting changes
4. Update documentation as needed

## License

MIT License - see LICENSE file for details