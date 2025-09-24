import { ModuleRegistry, Logger } from '@n8n/backend-common';
import { GLOBAL_OWNER_ROLE, type AuthenticatedRequest } from '@n8n/db';
import { Get, Patch, Post, RestController } from '@n8n/decorators';

import { McpServerApiKeyService } from './mcp-api-key.service';
import { McpSettingsService } from './mcp.settings.service';
import { isMcpSettingsUpdateBody } from './mcp.typeguards';
import { BadRequestError } from '../../errors/response-errors/bad-request.error';
import { ForbiddenError } from '../../errors/response-errors/forbidden.error';

@RestController('/mcp')
export class McpSettingsController {
	constructor(
		private readonly mcpSettingsService: McpSettingsService,
		private readonly logger: Logger,
		private readonly moduleRegistry: ModuleRegistry,
		private readonly mcpServerApiKeyService: McpServerApiKeyService,
	) {}

	@Get('/settings')
	async getSettings() {
		const mcpAccessEnabled = await this.mcpSettingsService.getEnabled();
		return { mcpAccessEnabled };
	}

	@Patch('/settings')
	async updateSettings(req: AuthenticatedRequest) {
		if (req.user.role?.slug !== GLOBAL_OWNER_ROLE.slug) {
			throw new ForbiddenError('Only the instance owner can update MCP settings');
		}
		const body = req.body;
		if (!isMcpSettingsUpdateBody(body)) {
			throw new BadRequestError('`mcpAccessEnabled` (boolean) is required');
		}
		const enabled = body.mcpAccessEnabled;
		await this.mcpSettingsService.setEnabled(enabled);
		try {
			this.moduleRegistry.settings.set('mcp', { mcpAccessEnabled: enabled });
		} catch (error) {
			this.logger.warn('Failed to sync MCP settings to module registry', {
				cause: error instanceof Error ? error.message : String(error),
			});
		}
		return { mcpAccessEnabled: enabled };
	}

	@Get('/api-key')
	async getApiKeyForMcpServer(req: AuthenticatedRequest) {
		const apiKey = await this.mcpServerApiKeyService.findServerApiKeyForUser(req.user);

		if (!apiKey) {
			const newApiKey = await this.mcpServerApiKeyService.createMcpServerApiKey(req.user);
			return newApiKey;
		}

		return apiKey;
	}

	@Post('/api-key/rotate')
	async rotateApiKeyForMcpServer(req: AuthenticatedRequest) {
		const apiKey = await this.mcpServerApiKeyService.findServerApiKeyForUser(req.user);

		if (!apiKey) {
			throw new BadRequestError('No existing MCP server API key to rotate');
		}

		await this.mcpServerApiKeyService.deleteApiKeyForUser(req.user);

		const newApiKey = await this.mcpServerApiKeyService.createMcpServerApiKey(req.user);

		return newApiKey;
	}
}
