import { MCPTool } from '@/types';

/**
 * MCP Client for connecting to FastAPI + Custom Tools servers
 */
export class MCPClient {
  private apiUrl: string;
  private customToolsUrl: string;

  constructor(apiUrl: string = 'http://localhost:8000', customToolsUrl: string = 'http://localhost:8001') {
    this.apiUrl = apiUrl;
    this.customToolsUrl = customToolsUrl;
  }

  /**
   * Get available tools from FastAPI server (via OpenAPI schema)
   */
  async getAPITools(): Promise<MCPTool[]> {
    try {
      console.log('🔍 Fetching API tools from:', `${this.apiUrl}/openapi.json`);
      const response = await fetch(`${this.apiUrl}/openapi.json`);
      
      if (!response.ok) {
        console.error('❌ Failed to fetch OpenAPI schema:', response.status);
        return [];
      }
      
      const schema = await response.json();
      console.log('✅ OpenAPI schema loaded:', schema.info?.title);
      console.log('📋 Paths found:', Object.keys(schema.paths || {}).length);

      const tools: MCPTool[] = [];

      // Convert OpenAPI paths to MCP tools
      for (const [path, methods] of Object.entries(schema.paths || {})) {
        for (const [method, details] of Object.entries(methods as any)) {
          if (['get', 'post', 'put', 'patch', 'delete'].includes(method)) {
            const operationId = (details as any).operationId || `${method}_${path.replace(/\//g, '_')}`;
            
            tools.push({
              name: operationId,
              description: (details as any).summary || (details as any).description || `${method.toUpperCase()} ${path}`,
              inputSchema: this.convertOpenAPIToMCPSchema(details as any, path, method),
            });
            
            console.log(`✅ Added tool: ${operationId}`);
          }
        }
      }

      console.log(`📊 Total tools loaded: ${tools.length}`);
      return tools;
    } catch (error) {
      console.error('❌ Error fetching API tools:', error);
      return [];
    }
  }

  /**
   * Convert OpenAPI parameter schema to MCP input schema
   */
  private convertOpenAPIToMCPSchema(operation: any, path: string, method: string): any {
    const properties: Record<string, any> = {};
    const required: string[] = [];

    // Handle path parameters
    const pathParams = path.match(/\{([^}]+)\}/g) || [];
    pathParams.forEach(param => {
      const paramName = param.replace(/[{}]/g, '');
      properties[paramName] = { type: 'string', description: `Path parameter: ${paramName}` };
      required.push(paramName);
    });

    // Handle query parameters
    if (operation.parameters) {
      operation.parameters.forEach((param: any) => {
        if (param.in === 'query') {
          properties[param.name] = {
            type: param.schema?.type || 'string',
            description: param.description || param.name,
          };
          if (param.required) {
            required.push(param.name);
          }
        }
      });
    }

    // Handle request body
    if (operation.requestBody?.content?.['application/json']?.schema) {
      const bodySchema = operation.requestBody.content['application/json'].schema;
      Object.assign(properties, bodySchema.properties || {});
      if (bodySchema.required) {
        required.push(...bodySchema.required);
      }
    }

    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined,
    };
  }

  /**
   * Call a FastAPI endpoint
   */
  async callAPITool(toolName: string, input: any): Promise<any> {
    try {
      // Parse the operation to determine HTTP method and path
      const response = await fetch(`${this.apiUrl}/openapi.json`);
      const schema = await response.json();

      // Find the operation
      for (const [path, methods] of Object.entries(schema.paths || {})) {
        for (const [method, details] of Object.entries(methods as any)) {
          if ((details as any).operationId === toolName) {
            return await this.makeAPIRequest(method, path, input);
          }
        }
      }

      throw new Error(`Tool ${toolName} not found`);
    } catch (error) {
      console.error('Error calling API tool:', error);
      throw error;
    }
  }

  /**
   * Make HTTP request to FastAPI
   */
  private async makeAPIRequest(method: string, path: string, input: any): Promise<any> {
    // Replace path parameters
    let url = path;
    const pathParams = path.match(/\{([^}]+)\}/g) || [];
    pathParams.forEach(param => {
      const paramName = param.replace(/[{}]/g, '');
      if (input[paramName]) {
        url = url.replace(param, input[paramName]);
        delete input[paramName];
      }
    });

    const options: RequestInit = {
      method: method.toUpperCase(),
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (method === 'get') {
      // Add query parameters
      const queryParams = new URLSearchParams();
      Object.entries(input).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
      const queryString = queryParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    } else {
      // Add body for POST, PUT, PATCH
      options.body = JSON.stringify(input);
    }

    const response = await fetch(`${this.apiUrl}${url}`, options);
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error: ${response.status} - ${error}`);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return { success: true };
    }

    return await response.json();
  }

  /**
   * Get custom MCP tools (these would come from your custom_tools_standalone.py)
   * For demo purposes, we'll define them manually
   */
  async getCustomTools(): Promise<MCPTool[]> {
    // In a real implementation, you'd fetch these from the MCP server
    // For now, we'll return the tools we know are available
    return [
      {
        name: 'calculate_inventory_value',
        description: 'Calculate total inventory value, optionally filtered by category',
        inputSchema: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              description: 'Optional product category to filter by',
            },
          },
        },
      },
      {
        name: 'find_low_stock_products',
        description: 'Find products with stock below threshold',
        inputSchema: {
          type: 'object',
          properties: {
            threshold: {
              type: 'integer',
              description: 'Stock level threshold (default: 10)',
              default: 10,
            },
          },
        },
      },
      {
        name: 'get_price_statistics',
        description: 'Calculate price statistics across products',
        inputSchema: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              description: 'Optional category to filter by',
            },
          },
        },
      },
      {
        name: 'generate_restock_report',
        description: 'Generate comprehensive restock recommendations',
        inputSchema: {
          type: 'object',
          properties: {
            threshold: {
              type: 'integer',
              description: 'Urgency threshold for stock level',
              default: 30,
            },
            days_of_stock: {
              type: 'integer',
              description: 'Target days of inventory to maintain',
              default: 60,
            },
          },
        },
      },
      {
        name: 'compare_categories',
        description: 'Compare performance across all product categories',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ];
  }

  /**
   * Call a custom MCP tool
   * In a real implementation, this would call your custom_tools_standalone.py server
   */
  async callCustomTool(toolName: string, input: any): Promise<any> {
    // For demo, we'll simulate calling the custom tools
    // In production, you'd make an actual MCP call to your Python server
    
    console.log(`Calling custom tool: ${toolName} with input:`, input);
    
    // Simulate API call with delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Return mock data based on tool name
    switch (toolName) {
      case 'calculate_inventory_value':
        return {
          category: input.category || 'all',
          total_inventory_value: 145234.56,
          product_count: 8,
          average_price: 412.49,
          currency: 'USD',
        };
      
      case 'find_low_stock_products':
        return {
          threshold: input.threshold || 10,
          low_stock_count: 2,
          products: [
            { id: '1', name: 'Standing Desk', current_stock: 20, category: 'Furniture', price: 399.99 },
            { id: '2', name: 'Office Chair', current_stock: 30, category: 'Furniture', price: 249.99 },
          ],
        };
      
      default:
        return { message: 'Tool executed successfully', input };
    }
  }
}
