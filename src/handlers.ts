import { TelegramExecutionContext } from '@codebam/cf-workers-telegram-bot';
import { Environment } from './types.js';
import { upsertUser, logInteraction } from './database.js';
import { isAdmin, generateStatsReport } from './admin.js';

export async function handleStartCommand(context: TelegramExecutionContext, env: Environment): Promise<Response> {
	try {
		switch (context.update_type) {
			case 'message':
				const update = context.update;
				const message = update?.message;
				const user = message?.from;

				if (user) {
					// Save/update user in database
					await upsertUser(env.bot_users_db, {
						telegram_id: user.id,
						username: user.username,
						first_name: user.first_name,
						language_code: user.language_code,
						is_bot: user.is_bot,
					});

					// Log interaction
					await logInteraction(env.bot_users_db, user.id, 'start', message?.text, '/start');
				}

				await context.reply('yalan dunya!');
				break;

			default:
				break;
		}
	} catch (error) {
		console.error('Error handling start command:', error);
		const errorMessage = `Sorry, something went wrong: ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`;
		await context.reply(errorMessage);
	}
	return new Response('ok');
}

export async function handleChatIdCommand(context: TelegramExecutionContext, env: Environment): Promise<Response> {
	try {
		const update = context.update;
		const message = update?.message;
		const user = message?.from;

		if (user) {
			// Save/update user in database
			await upsertUser(env.bot_users_db, {
				telegram_id: user.id,
				username: user.username,
				first_name: user.first_name,
				language_code: user.language_code,
				is_bot: user.is_bot,
			});

			// Log interaction for /chatid command
			await logInteraction(env.bot_users_db, user.id, 'command', message?.text, '/chatid');

			await context.reply(`Your chat ID is: \`${user.id}\``);
		}
	} catch (error) {
		console.error('Error handling chatid command:', error);
		const errorMessage = `Sorry, something went wrong: ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`;
		await context.reply(errorMessage);
	}
	return new Response('ok');
}

export async function handleStatsCommand(context: TelegramExecutionContext, env: Environment): Promise<Response> {
	try {
		const update = context.update;
		const message = update?.message;
		const user = message?.from;

		if (user) {
			// Save/update user in database
			await upsertUser(env.bot_users_db, {
				telegram_id: user.id,
				username: user.username,
				first_name: user.first_name,
				language_code: user.language_code,
				is_bot: user.is_bot,
			});

			// Check if this is the admin requesting stats
			if (isAdmin(user.id.toString(), env.ADMIN_CHAT_ID)) {
				const statsMessage = await generateStatsReport(env.bot_users_db);
				await context.reply(statsMessage);

				// Log interaction for /stats command
				await logInteraction(env.bot_users_db, user.id, 'command', message?.text, '/stats');
			} else {
				await context.reply('Sorry, this command is only available to administrators.');
			}
		}
	} catch (error) {
		console.error('Error handling stats command:', error);
		const errorMessage = `Sorry, something went wrong: ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`;
		await context.reply(errorMessage);
	}
	return new Response('ok');
}

export async function handleReportCommand(context: TelegramExecutionContext, env: Environment): Promise<Response> {
	try {
		const update = context.update;
		const message = update?.message;
		const user = message?.from;

		if (user) {
			// Save/update user in database
			await upsertUser(env.bot_users_db, {
				telegram_id: user.id,
				username: user.username,
				first_name: user.first_name,
				language_code: user.language_code,
				is_bot: user.is_bot,
			});

			// Check if this is the admin requesting report
			if (isAdmin(user.id.toString(), env.ADMIN_CHAT_ID)) {
				const statsMessage = await generateStatsReport(env.bot_users_db);
				await context.reply(statsMessage);

				// Log interaction for /report command
				await logInteraction(env.bot_users_db, user.id, 'command', message?.text, '/report');
			} else {
				await context.reply('Sorry, this command is only available to administrators.');
			}
		}
	} catch (error) {
		console.error('Error handling report command:', error);
		const errorMessage = `Sorry, something went wrong: ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`;
		await context.reply(errorMessage);
	}
	return new Response('ok');
}

export async function handleMessage(context: TelegramExecutionContext, env: Environment): Promise<Response> {
	try {
		const update = context.update;
		const message = update?.message;
		const user = message?.from;

		if (user) {
			// Save/update user in database
			await upsertUser(env.bot_users_db, {
				telegram_id: user.id,
				username: user.username,
				first_name: user.first_name,
				language_code: user.language_code,
				is_bot: user.is_bot,
			});

			// Log interaction
			await logInteraction(env.bot_users_db, user.id, 'message', message?.text);

			// Regular bot response (only for non-command messages)
			const text = message?.text?.toLowerCase();
			if (!text?.startsWith('/')) {
				await context.reply('yalan dunya!');
			}
		}
	} catch (error) {
		console.error('Error handling message:', error);
		const errorMessage = `Sorry, something went wrong: ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`;
		await context.reply(errorMessage);
	}
	return new Response('ok');
}
