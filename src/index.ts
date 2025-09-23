import TelegramBot from '@codebam/cf-workers-telegram-bot';
import { Environment } from './types.js';
import { t } from './i18n.js';
import {
	handleStartCommand,
	handleChatIdCommand,
	handleStatsCommand,
	handleReportCommand,
	handleMessage,
	handleRemindCommand,
	handleRemindersCommand,
	handleHelpCommand,
	handleAdminCommand
} from './handlers.js';
import { handleScheduledEvent } from './scheduler.js';

export default {
	async fetch(request: Request, env: Environment, ctx: ExecutionContext): Promise<Response> {
		const bot = new TelegramBot(env.SECRET_TELEGRAM_API_TOKEN);

		await bot
			.on('start', async (context) => handleStartCommand(context, env))
			.on('chatid', async (context) => handleChatIdCommand(context, env))
			.on('stats', async (context) => handleStatsCommand(context, env))
			.on('report', async (context) => handleReportCommand(context, env))
			.on('remind', async (context) => handleRemindCommand(context, env))
			.on('reminders', async (context) => handleRemindersCommand(context, env))
			.on('help', async (context) => handleHelpCommand(context, env))
			.on('admin', async (context) => handleAdminCommand(context, env))
			.on('message', async (context) => handleMessage(context, env))
			.handle(request.clone());

		return new Response(t('greetings.default_message'));
	},

	async scheduled(event: ScheduledEvent, env: Environment, ctx: ExecutionContext): Promise<void> {
		await handleScheduledEvent(event, env, ctx);
	},
};
