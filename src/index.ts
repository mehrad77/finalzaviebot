import TelegramBot from '@codebam/cf-workers-telegram-bot';
import { Environment } from './types.js';
import {
	handleStartCommand,
	handleChatIdCommand,
	handleStatsCommand,
	handleReportCommand,
	handleMessage
} from './handlers.js';

export default {
	async fetch(request: Request, env: Environment, ctx: ExecutionContext): Promise<Response> {
		const bot = new TelegramBot(env.SECRET_TELEGRAM_API_TOKEN);

		await bot
			.on('start', async (context) => handleStartCommand(context, env))
			.on('chatid', async (context) => handleChatIdCommand(context, env))
			.on('stats', async (context) => handleStatsCommand(context, env))
			.on('report', async (context) => handleReportCommand(context, env))
			.on('message', async (context) => handleMessage(context, env))
			.handle(request.clone());

		return new Response('yalan dunya!');
	},
};
