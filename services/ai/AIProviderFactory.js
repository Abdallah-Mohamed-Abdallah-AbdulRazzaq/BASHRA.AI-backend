const OpenAIProvider = require('./OpenAIProvider');

class AIProviderFactory {
  static createProvider() {
    const provider = process.env.AI_PROVIDER || 'openai';

    if (provider === 'openai') {
      return new OpenAIProvider();
    }

    throw new Error(`Unsupported AI provider: ${provider}`);
  }
}

module.exports = AIProviderFactory;