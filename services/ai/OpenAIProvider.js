const OpenAI = require('openai');
const { DERMATOLOGY_SYSTEM_PROMPT } = require('./dermatologyPrompt');

class OpenAIProvider {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is missing');
    }

    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    this.model = process.env.AI_MODEL || 'gpt-4.1-mini';
    this.temperature = Number(process.env.AI_TEMPERATURE || 0.2);
  }

  getDermatologyJsonSchema() {
    return {
      type: 'object',
      additionalProperties: false,
      properties: {
        language: {
          type: 'string',
          enum: ['ar', 'en']
        },
        response_kind: {
          type: 'string',
          enum: [
            'dermatology_chat',
            'dermatology_assessment',
            'follow_up',
            'small_talk',
            'out_of_scope',
            'safety_triage',
            'image_analysis',
            'document_analysis',
            'final_summary'
          ]
        },
        conversation_reply: {
          type: 'string'
        },
        case_summary: {
          type: 'string'
        },
        possible_conditions: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              name: { type: 'string' },
              likelihood: {
                type: 'string',
                enum: ['low', 'medium', 'high']
              },
              reasoning: { type: 'string' }
            },
            required: ['name', 'likelihood', 'reasoning']
          }
        },
        severity: {
          type: 'string',
          enum: ['mild', 'moderate', 'severe', 'urgent']
        },
        red_flags: {
          type: 'array',
          items: { type: 'string' }
        },
        safe_advice: {
          type: 'array',
          items: { type: 'string' }
        },
        avoid: {
          type: 'array',
          items: { type: 'string' }
        },
        recommended_next_step: {
          type: 'string',
          enum: ['self_care', 'book_dermatologist', 'urgent_care', 'doctor_review']
        },
        follow_up_questions: {
          type: 'array',
          items: { type: 'string' }
        },
        needs_doctor_review: {
          type: 'boolean'
        },
        confidence_level: {
          type: 'string',
          enum: ['low', 'medium', 'high']
        },
        disclaimer: {
          type: 'string'
        }
      },
      required: [
        'language',
        'response_kind',
        'conversation_reply',
        'case_summary',
        'possible_conditions',
        'severity',
        'red_flags',
        'safe_advice',
        'avoid',
        'recommended_next_step',
        'follow_up_questions',
        'needs_doctor_review',
        'confidence_level',
        'disclaimer'
      ]
    };
  }

  async analyzeTextMessage({ message, languageCode = 'ar', previousMessages = [] }) {
    const startTime = Date.now();

    const conversationContext = previousMessages
      .slice(-10)
      .map((msg) => {
        const role = msg.sender_type === 'ai' ? 'assistant' : 'user';
        return `${role}: ${msg.content || ''}`;
      })
      .join('\n');

    const userPrompt = `
User language: ${languageCode}

Previous conversation context:
${conversationContext || 'No previous context.'}

Current user message:
${message}

Respond as a conversational dermatology-focused assistant.
Use previous context when relevant.
If this is a follow-up or small conversational message, do not force a full rigid assessment.
The conversation_reply field must be the natural message shown to the patient.
The case_summary field must be a concise clinical summary for storage/doctor review.
Return JSON only according to the required schema.
`;

    const response = await this.client.responses.create({
      model: this.model,
      input: [
        {
          role: 'system',
          content: [
            {
              type: 'input_text',
              text: DERMATOLOGY_SYSTEM_PROMPT
            }
          ]
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: userPrompt
            }
          ]
        }
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'dermatology_ai_response',
          strict: true,
          schema: this.getDermatologyJsonSchema()
        }
      },
      temperature: this.temperature
    });

    const outputText = response.output_text;

    if (!outputText) {
      throw new Error('OpenAI returned empty output_text');
    }

    let parsed;

    try {
      parsed = JSON.parse(outputText);
    } catch (error) {
      throw new Error(`Failed to parse OpenAI JSON response: ${error.message}`);
    }

    return {
      data: parsed,
      raw: response,
      usage: {
        prompt_tokens: response.usage?.input_tokens || 0,
        completion_tokens: response.usage?.output_tokens || 0,
        total_tokens: response.usage?.total_tokens || 0
      },
      processing_time_ms: Date.now() - startTime,
      provider: 'openai',
      model: this.model
    };
  }

  async analyzeImageMessage({
    imageFile,
    description = '',
    languageCode = 'ar',
    previousMessages = []
  }) {
    const startTime = Date.now();

    if (!imageFile || !imageFile.buffer) {
      throw new Error('Image file buffer is missing');
    }

    const conversationContext = previousMessages
      .slice(-10)
      .map((msg) => {
        const role = msg.sender_type === 'ai' ? 'assistant' : 'user';
        return `${role}: ${msg.content || ''}`;
      })
      .join('\n');

    const base64Image = imageFile.buffer.toString('base64');
    const dataUrl = `data:${imageFile.mimetype};base64,${base64Image}`;

    const userPrompt = `
User language: ${languageCode}

Previous conversation context:
${conversationContext || 'No previous context.'}

User description:
${description || 'No description provided.'}

Analyze the attached skin image safely as a conversational dermatology-focused AI assistant.
The conversation_reply field must be the natural message shown to the patient.
The case_summary field must be a concise clinical summary for storage/doctor review.

Important image rules:
- The image may be unclear, incomplete, or affected by lighting.
- Do not provide a final diagnosis from the image alone.
- Mention when visual quality is insufficient.
- Ask follow-up questions when needed.
- If the image suggests urgent red flags, recommend urgent medical care.
- Return JSON only according to the required schema.
`;

    const response = await this.client.responses.create({
      model: this.model,
      input: [
        {
          role: 'system',
          content: [
            {
              type: 'input_text',
              text: DERMATOLOGY_SYSTEM_PROMPT
            }
          ]
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: userPrompt
            },
            {
              type: 'input_image',
              image_url: dataUrl
            }
          ]
        }
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'dermatology_ai_image_response',
          strict: true,
          schema: this.getDermatologyJsonSchema()
        }
      },
      temperature: this.temperature
    });

    const outputText = response.output_text;

    if (!outputText) {
      throw new Error('OpenAI returned empty output_text for image analysis');
    }

    let parsed;

    try {
      parsed = JSON.parse(outputText);
    } catch (error) {
      throw new Error(`Failed to parse OpenAI image JSON response: ${error.message}`);
    }

    return {
      data: parsed,
      raw: response,
      usage: {
        prompt_tokens: response.usage?.input_tokens || 0,
        completion_tokens: response.usage?.output_tokens || 0,
        total_tokens: response.usage?.total_tokens || 0
      },
      processing_time_ms: Date.now() - startTime,
      provider: 'openai',
      model: this.model
    };
  }

  async analyzeDocumentMessage({
    documentFile,
    description = '',
    languageCode = 'ar',
    previousMessages = []
  }) {
    const startTime = Date.now();

    if (!documentFile || !documentFile.buffer) {
      throw new Error('Document file buffer is missing');
    }

    const supportedMimeTypes = [
      'application/pdf',
      'text/plain'
    ];

    if (!supportedMimeTypes.includes(documentFile.mimetype)) {
      throw new Error('Unsupported document type for AI analysis. Only PDF and TXT are supported now.');
    }

    const conversationContext = previousMessages
      .slice(-10)
      .map((msg) => {
        const role = msg.sender_type === 'ai' ? 'assistant' : 'user';
        return `${role}: ${msg.content || ''}`;
      })
      .join('\n');

    const userPrompt = `
User language: ${languageCode}

Previous conversation context:
${conversationContext || 'No previous context.'}

User description:
${description || 'No description provided.'}

Analyze the attached medical/dermatology-related document safely as a conversational dermatology-focused AI assistant.
The conversation_reply field must be the natural message shown to the patient.
The case_summary field must be a concise clinical summary for storage/doctor review.

Document analysis rules:
- Summarize the document in simple language.
- Extract dermatology-related findings only when present.
- Do not invent results that are not in the document.
- Do not provide a final diagnosis.
- If the document is unrelated to dermatology, say that clearly.
- If the document suggests urgent red flags, recommend urgent medical care.
- If the document is unclear, incomplete, or unreadable, say so.
- Return JSON only according to the required schema.
`;

    const content = [
      {
        type: 'input_text',
        text: userPrompt
      }
    ];

    if (documentFile.mimetype === 'text/plain') {
      const textContent = documentFile.buffer.toString('utf8');

      content.push({
        type: 'input_text',
        text: `
Document text content:
${textContent.slice(0, 20000)}
`
      });
    } else {
      const base64File = documentFile.buffer.toString('base64');
      const fileData = `data:${documentFile.mimetype};base64,${base64File}`;

      content.push({
        type: 'input_file',
        filename: documentFile.originalname || 'medical-report.pdf',
        file_data: fileData
      });
    }

    const response = await this.client.responses.create({
      model: this.model,
      input: [
        {
          role: 'system',
          content: [
            {
              type: 'input_text',
              text: DERMATOLOGY_SYSTEM_PROMPT
            }
          ]
        },
        {
          role: 'user',
          content
        }
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'dermatology_ai_document_response',
          strict: true,
          schema: this.getDermatologyJsonSchema()
        }
      },
      temperature: this.temperature
    });

    const outputText = response.output_text;

    if (!outputText) {
      throw new Error('OpenAI returned empty output_text for document analysis');
    }

    let parsed;

    try {
      parsed = JSON.parse(outputText);
    } catch (error) {
      throw new Error(`Failed to parse OpenAI document JSON response: ${error.message}`);
    }

    return {
      data: parsed,
      raw: response,
      usage: {
        prompt_tokens: response.usage?.input_tokens || 0,
        completion_tokens: response.usage?.output_tokens || 0,
        total_tokens: response.usage?.total_tokens || 0
      },
      processing_time_ms: Date.now() - startTime,
      provider: 'openai',
      model: this.model
    };
  }

  async generateFinalSummary({
    session,
    messages = [],
    results = [],
    files = []
  }) {
    const startTime = Date.now();

    const compactMessages = messages
      .slice(-20)
      .map((message) => ({
        sender_type: message.sender_type,
        message_type: message.message_type,
        content: message.content,
        created_at: message.created_at
      }));

    const compactResults = results
      .slice(0, 10)
      .map((result) => ({
        result_type: result.result_type,
        response_kind: result.ai_response_json?.response_kind || null,
        conversation_reply: result.ai_response_json?.conversation_reply || null,
        case_summary: result.case_summary,
        possible_conditions: result.possible_conditions,
        severity: result.severity,
        red_flags: result.red_flags,
        recommended_next_step: result.recommended_next_step,
        confidence_level: result.confidence_level,
        created_at: result.created_at
      }));

    const compactFiles = files.map((file) => ({
      file_role: file.file_role,
      analysis_status: file.analysis_status,
      file_category: file.file_category,
      original_filename: file.original_filename,
      mime_type: file.mime_type,
      file_size: file.file_size,
      created_at: file.created_at
    }));

    const userPrompt = `
User language: ${session.language_code || 'ar'}

You are generating the final AI dermatology session summary.

Session:
${JSON.stringify({
  uuid: session.uuid,
  title: session.title,
  input_mode: session.input_mode,
  specialty: session.specialty,
  risk_level: session.risk_level,
  created_at: session.created_at,
  last_message_at: session.last_message_at
}, null, 2)}

Messages context:
${JSON.stringify(compactMessages, null, 2)}

Uploaded files context:
${JSON.stringify(compactFiles, null, 2)}

Previous AI analysis results:
${JSON.stringify(compactResults, null, 2)}

Task:
Create a final dermatology-focused summary for this AI session.
The conversation_reply field must be a natural final message shown to the patient.
The case_summary field must be a concise clinical summary for storage/doctor review.

Rules:
- Do not provide a final medical diagnosis.
- Summarize the case clearly for the user and for a dermatologist.
- Combine text, image, and document analysis when available.
- Identify only red flags that are present or strongly implied.
- Recommend the safest next step.
- If uncertainty remains, recommend dermatologist review.
- Return JSON only according to the required schema.
`;

    const response = await this.client.responses.create({
      model: this.model,
      input: [
        {
          role: 'system',
          content: [
            {
              type: 'input_text',
              text: DERMATOLOGY_SYSTEM_PROMPT
            }
          ]
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: userPrompt
            }
          ]
        }
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'dermatology_ai_final_summary',
          strict: true,
          schema: this.getDermatologyJsonSchema()
        }
      },
      temperature: this.temperature
    });

    const outputText = response.output_text;

    if (!outputText) {
      throw new Error('OpenAI returned empty output_text for final summary');
    }

    let parsed;

    try {
      parsed = JSON.parse(outputText);
    } catch (error) {
      throw new Error(`Failed to parse OpenAI final summary JSON response: ${error.message}`);
    }

    return {
      data: parsed,
      raw: response,
      usage: {
        prompt_tokens: response.usage?.input_tokens || 0,
        completion_tokens: response.usage?.output_tokens || 0,
        total_tokens: response.usage?.total_tokens || 0
      },
      processing_time_ms: Date.now() - startTime,
      provider: 'openai',
      model: this.model
    };
  }

}

module.exports = OpenAIProvider;
















































// const OpenAI = require('openai');
// const { DERMATOLOGY_SYSTEM_PROMPT } = require('./dermatologyPrompt');

// class OpenAIProvider {
//   constructor() {
//     if (!process.env.OPENAI_API_KEY) {
//       throw new Error('OPENAI_API_KEY is missing');
//     }

//     this.client = new OpenAI({
//       apiKey: process.env.OPENAI_API_KEY
//     });

//     this.model = process.env.AI_MODEL || 'gpt-4.1-mini';
//     this.temperature = Number(process.env.AI_TEMPERATURE || 0.2);
//   }

//   getDermatologyJsonSchema() {
//     return {
//       type: 'object',
//       additionalProperties: false,
//       properties: {
//         language: {
//           type: 'string',
//           enum: ['ar', 'en']
//         },
//         case_summary: {
//           type: 'string'
//         },
//         possible_conditions: {
//           type: 'array',
//           items: {
//             type: 'object',
//             additionalProperties: false,
//             properties: {
//               name: { type: 'string' },
//               likelihood: {
//                 type: 'string',
//                 enum: ['low', 'medium', 'high']
//               },
//               reasoning: { type: 'string' }
//             },
//             required: ['name', 'likelihood', 'reasoning']
//           }
//         },
//         severity: {
//           type: 'string',
//           enum: ['mild', 'moderate', 'severe', 'urgent']
//         },
//         red_flags: {
//           type: 'array',
//           items: { type: 'string' }
//         },
//         safe_advice: {
//           type: 'array',
//           items: { type: 'string' }
//         },
//         avoid: {
//           type: 'array',
//           items: { type: 'string' }
//         },
//         recommended_next_step: {
//           type: 'string',
//           enum: ['self_care', 'book_dermatologist', 'urgent_care', 'doctor_review']
//         },
//         follow_up_questions: {
//           type: 'array',
//           items: { type: 'string' }
//         },
//         needs_doctor_review: {
//           type: 'boolean'
//         },
//         confidence_level: {
//           type: 'string',
//           enum: ['low', 'medium', 'high']
//         },
//         disclaimer: {
//           type: 'string'
//         }
//       },
//       required: [
//         'language',
//         'case_summary',
//         'possible_conditions',
//         'severity',
//         'red_flags',
//         'safe_advice',
//         'avoid',
//         'recommended_next_step',
//         'follow_up_questions',
//         'needs_doctor_review',
//         'confidence_level',
//         'disclaimer'
//       ]
//     };
//   }

//   async analyzeTextMessage({ message, languageCode = 'ar', previousMessages = [] }) {
//     const startTime = Date.now();

//     const conversationContext = previousMessages
//       .slice(-10)
//       .map((msg) => {
//         const role = msg.sender_type === 'ai' ? 'assistant' : 'user';
//         return `${role}: ${msg.content || ''}`;
//       })
//       .join('\n');

//     const userPrompt = `
// User language: ${languageCode}

// Previous conversation context:
// ${conversationContext || 'No previous context.'}

// Current user message:
// ${message}

// Analyze this dermatology-related message safely.
// Return JSON only according to the required schema.
// `;

//     const response = await this.client.responses.create({
//       model: this.model,
//       input: [
//         {
//           role: 'system',
//           content: [
//             {
//               type: 'input_text',
//               text: DERMATOLOGY_SYSTEM_PROMPT
//             }
//           ]
//         },
//         {
//           role: 'user',
//           content: [
//             {
//               type: 'input_text',
//               text: userPrompt
//             }
//           ]
//         }
//       ],
//       text: {
//         format: {
//           type: 'json_schema',
//           name: 'dermatology_ai_response',
//           strict: true,
//           schema: this.getDermatologyJsonSchema()
//         }
//       },
//       temperature: this.temperature
//     });

//     const outputText = response.output_text;

//     if (!outputText) {
//       throw new Error('OpenAI returned empty output_text');
//     }

//     let parsed;

//     try {
//       parsed = JSON.parse(outputText);
//     } catch (error) {
//       throw new Error(`Failed to parse OpenAI JSON response: ${error.message}`);
//     }

//     return {
//       data: parsed,
//       raw: response,
//       usage: {
//         prompt_tokens: response.usage?.input_tokens || 0,
//         completion_tokens: response.usage?.output_tokens || 0,
//         total_tokens: response.usage?.total_tokens || 0
//       },
//       processing_time_ms: Date.now() - startTime,
//       provider: 'openai',
//       model: this.model
//     };
//   }

//   async analyzeImageMessage({
//     imageFile,
//     description = '',
//     languageCode = 'ar',
//     previousMessages = []
//   }) {
//     const startTime = Date.now();

//     if (!imageFile || !imageFile.buffer) {
//       throw new Error('Image file buffer is missing');
//     }

//     const conversationContext = previousMessages
//       .slice(-10)
//       .map((msg) => {
//         const role = msg.sender_type === 'ai' ? 'assistant' : 'user';
//         return `${role}: ${msg.content || ''}`;
//       })
//       .join('\n');

//     const base64Image = imageFile.buffer.toString('base64');
//     const dataUrl = `data:${imageFile.mimetype};base64,${base64Image}`;

//     const userPrompt = `
// User language: ${languageCode}

// Previous conversation context:
// ${conversationContext || 'No previous context.'}

// User description:
// ${description || 'No description provided.'}

// Analyze the attached skin image safely as a dermatology-focused AI assistant.

// Important image rules:
// - The image may be unclear, incomplete, or affected by lighting.
// - Do not provide a final diagnosis from the image alone.
// - Mention when visual quality is insufficient.
// - Ask follow-up questions when needed.
// - If the image suggests urgent red flags, recommend urgent medical care.
// - Return JSON only according to the required schema.
// `;

//     const response = await this.client.responses.create({
//       model: this.model,
//       input: [
//         {
//           role: 'system',
//           content: [
//             {
//               type: 'input_text',
//               text: DERMATOLOGY_SYSTEM_PROMPT
//             }
//           ]
//         },
//         {
//           role: 'user',
//           content: [
//             {
//               type: 'input_text',
//               text: userPrompt
//             },
//             {
//               type: 'input_image',
//               image_url: dataUrl
//             }
//           ]
//         }
//       ],
//       text: {
//         format: {
//           type: 'json_schema',
//           name: 'dermatology_ai_image_response',
//           strict: true,
//           schema: this.getDermatologyJsonSchema()
//         }
//       },
//       temperature: this.temperature
//     });

//     const outputText = response.output_text;

//     if (!outputText) {
//       throw new Error('OpenAI returned empty output_text for image analysis');
//     }

//     let parsed;

//     try {
//       parsed = JSON.parse(outputText);
//     } catch (error) {
//       throw new Error(`Failed to parse OpenAI image JSON response: ${error.message}`);
//     }

//     return {
//       data: parsed,
//       raw: response,
//       usage: {
//         prompt_tokens: response.usage?.input_tokens || 0,
//         completion_tokens: response.usage?.output_tokens || 0,
//         total_tokens: response.usage?.total_tokens || 0
//       },
//       processing_time_ms: Date.now() - startTime,
//       provider: 'openai',
//       model: this.model
//     };
//   }

//   async analyzeDocumentMessage({
//     documentFile,
//     description = '',
//     languageCode = 'ar',
//     previousMessages = []
//   }) {
//     const startTime = Date.now();

//     if (!documentFile || !documentFile.buffer) {
//       throw new Error('Document file buffer is missing');
//     }

//     const supportedMimeTypes = [
//       'application/pdf',
//       'text/plain'
//     ];

//     if (!supportedMimeTypes.includes(documentFile.mimetype)) {
//       throw new Error('Unsupported document type for AI analysis. Only PDF and TXT are supported now.');
//     }

//     const conversationContext = previousMessages
//       .slice(-10)
//       .map((msg) => {
//         const role = msg.sender_type === 'ai' ? 'assistant' : 'user';
//         return `${role}: ${msg.content || ''}`;
//       })
//       .join('\n');

//     const userPrompt = `
// User language: ${languageCode}

// Previous conversation context:
// ${conversationContext || 'No previous context.'}

// User description:
// ${description || 'No description provided.'}

// Analyze the attached medical/dermatology-related document safely.

// Document analysis rules:
// - Summarize the document in simple language.
// - Extract dermatology-related findings only when present.
// - Do not invent results that are not in the document.
// - Do not provide a final diagnosis.
// - If the document is unrelated to dermatology, say that clearly.
// - If the document suggests urgent red flags, recommend urgent medical care.
// - If the document is unclear, incomplete, or unreadable, say so.
// - Return JSON only according to the required schema.
// `;

//     const content = [
//       {
//         type: 'input_text',
//         text: userPrompt
//       }
//     ];

//     if (documentFile.mimetype === 'text/plain') {
//       const textContent = documentFile.buffer.toString('utf8');

//       content.push({
//         type: 'input_text',
//         text: `
// Document text content:
// ${textContent.slice(0, 20000)}
// `
//       });
//     } else {
//       const base64File = documentFile.buffer.toString('base64');
//       const fileData = `data:${documentFile.mimetype};base64,${base64File}`;

//       content.push({
//         type: 'input_file',
//         filename: documentFile.originalname || 'medical-report.pdf',
//         file_data: fileData
//       });
//     }

//     const response = await this.client.responses.create({
//       model: this.model,
//       input: [
//         {
//           role: 'system',
//           content: [
//             {
//               type: 'input_text',
//               text: DERMATOLOGY_SYSTEM_PROMPT
//             }
//           ]
//         },
//         {
//           role: 'user',
//           content
//         }
//       ],
//       text: {
//         format: {
//           type: 'json_schema',
//           name: 'dermatology_ai_document_response',
//           strict: true,
//           schema: this.getDermatologyJsonSchema()
//         }
//       },
//       temperature: this.temperature
//     });

//     const outputText = response.output_text;

//     if (!outputText) {
//       throw new Error('OpenAI returned empty output_text for document analysis');
//     }

//     let parsed;

//     try {
//       parsed = JSON.parse(outputText);
//     } catch (error) {
//       throw new Error(`Failed to parse OpenAI document JSON response: ${error.message}`);
//     }

//     return {
//       data: parsed,
//       raw: response,
//       usage: {
//         prompt_tokens: response.usage?.input_tokens || 0,
//         completion_tokens: response.usage?.output_tokens || 0,
//         total_tokens: response.usage?.total_tokens || 0
//       },
//       processing_time_ms: Date.now() - startTime,
//       provider: 'openai',
//       model: this.model
//     };
//   }

//   async generateFinalSummary({
//     session,
//     messages = [],
//     results = [],
//     files = []
//   }) {
//     const startTime = Date.now();

//     const compactMessages = messages
//       .slice(-20)
//       .map((message) => ({
//         sender_type: message.sender_type,
//         message_type: message.message_type,
//         content: message.content,
//         created_at: message.created_at
//       }));

//     const compactResults = results
//       .slice(0, 10)
//       .map((result) => ({
//         result_type: result.result_type,
//         case_summary: result.case_summary,
//         possible_conditions: result.possible_conditions,
//         severity: result.severity,
//         red_flags: result.red_flags,
//         recommended_next_step: result.recommended_next_step,
//         confidence_level: result.confidence_level,
//         created_at: result.created_at
//       }));

//     const compactFiles = files.map((file) => ({
//       file_role: file.file_role,
//       analysis_status: file.analysis_status,
//       file_category: file.file_category,
//       original_filename: file.original_filename,
//       mime_type: file.mime_type,
//       file_size: file.file_size,
//       created_at: file.created_at
//     }));

//     const userPrompt = `
// User language: ${session.language_code || 'ar'}

// You are generating the final AI dermatology session summary.

// Session:
// ${JSON.stringify({
//   uuid: session.uuid,
//   title: session.title,
//   input_mode: session.input_mode,
//   specialty: session.specialty,
//   risk_level: session.risk_level,
//   created_at: session.created_at,
//   last_message_at: session.last_message_at
// }, null, 2)}

// Messages context:
// ${JSON.stringify(compactMessages, null, 2)}

// Uploaded files context:
// ${JSON.stringify(compactFiles, null, 2)}

// Previous AI analysis results:
// ${JSON.stringify(compactResults, null, 2)}

// Task:
// Create a final dermatology-focused summary for this AI session.

// Rules:
// - Do not provide a final medical diagnosis.
// - Summarize the case clearly for the user and for a dermatologist.
// - Combine text, image, and document analysis when available.
// - Identify only red flags that are present or strongly implied.
// - Recommend the safest next step.
// - If uncertainty remains, recommend dermatologist review.
// - Return JSON only according to the required schema.
// `;

//     const response = await this.client.responses.create({
//       model: this.model,
//       input: [
//         {
//           role: 'system',
//           content: [
//             {
//               type: 'input_text',
//               text: DERMATOLOGY_SYSTEM_PROMPT
//             }
//           ]
//         },
//         {
//           role: 'user',
//           content: [
//             {
//               type: 'input_text',
//               text: userPrompt
//             }
//           ]
//         }
//       ],
//       text: {
//         format: {
//           type: 'json_schema',
//           name: 'dermatology_ai_final_summary',
//           strict: true,
//           schema: this.getDermatologyJsonSchema()
//         }
//       },
//       temperature: this.temperature
//     });

//     const outputText = response.output_text;

//     if (!outputText) {
//       throw new Error('OpenAI returned empty output_text for final summary');
//     }

//     let parsed;

//     try {
//       parsed = JSON.parse(outputText);
//     } catch (error) {
//       throw new Error(`Failed to parse OpenAI final summary JSON response: ${error.message}`);
//     }

//     return {
//       data: parsed,
//       raw: response,
//       usage: {
//         prompt_tokens: response.usage?.input_tokens || 0,
//         completion_tokens: response.usage?.output_tokens || 0,
//         total_tokens: response.usage?.total_tokens || 0
//       },
//       processing_time_ms: Date.now() - startTime,
//       provider: 'openai',
//       model: this.model
//     };
//   }

// }

// module.exports = OpenAIProvider;