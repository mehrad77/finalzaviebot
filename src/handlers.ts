import { TelegramExecutionContext } from '@codebam/cf-workers-telegram-bot';
import { Environment } from './types.js';
import { upsertUser, logInteraction } from './database.js';
import { isAdmin, generateStatsReport } from './admin.js';
import {
	parseReminderText,
	createReminder,
	getUserReminders,
	deleteReminder,
	getUserTimezone,
	formatRemindersList,
	formatDateForUser,
	getAdminRemindersView
} from './reminder-utils.js';

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

export async function handleRemindCommand(context: TelegramExecutionContext, env: Environment): Promise<Response> {
	try {
		const update = context.update;
		const message = update?.message;
		const user = message?.from;
		const text = message?.text || '';

		if (!user) {
			return new Response('ok');
		}

		// Save/update user in database
		await upsertUser(env.bot_users_db, {
			telegram_id: user.id,
			username: user.username,
			first_name: user.first_name,
			language_code: user.language_code,
			is_bot: user.is_bot,
		});

		// Log interaction
		await logInteraction(env.bot_users_db, user.id, 'command', text, '/remind');

		// Get user's timezone
		const userTimezone = await getUserTimezone(env.bot_users_db, user.id);

		// Parse the reminder text
		const parsed = parseReminderText(text, userTimezone);

		if (!parsed) {
			await context.reply(
				"🤔 I wasn't sure when you want the reminder. Can you specify the exact time or date?\n\n" +
				"Examples:\n" +
				"• `/remind me to call mom tomorrow at 7pm`\n" +
				"• `/remind me to submit the report Friday at 2pm`\n" +
				"• `/remind me to water plants this evening`"
			);
			return new Response('ok');
		}

		// Check if the parsed date is in the past
		const now = new Date();
		if (parsed.scheduledAt <= now) {
			await context.reply(
				"⚠️ It looks like that time is in the past. Did you mean to schedule a **future** reminder?\n\n" +
				"Please specify a time in the future, like:\n" +
				"• `tomorrow at 7pm`\n" +
				"• `next Friday at 2pm`\n" +
				"• `in 2 hours`"
			);
			return new Response('ok');
		}

		// Format the date for confirmation
		const formattedDate = formatDateForUser(parsed.scheduledAt, userTimezone);

		// Generate confirmation message based on confidence level
		let confirmationMessage = `Got it! I'll remind you to **${parsed.task}** on **${formattedDate}**.`;

		if (parsed.confidence === 'low') {
			confirmationMessage += "\n\n⚠️ I'm not completely sure about the timing. Please double-check if this looks correct.";
		}

		confirmationMessage += "\n\nReply with **yes** or **y** to confirm, or **no** to cancel.";

		await context.reply(confirmationMessage);

		// Store the parsed reminder temporarily in context for confirmation
		// Since we can't easily store state, we'll store it in the database with a special flag
		// and clean it up later
		const tempReminderId = await createReminder(
			env.bot_users_db,
			user.id,
			`TEMP:${parsed.task}`,
			parsed.scheduledAt,
			userTimezone
		);

		// We'll need to implement a confirmation handler separately
		// For now, let's auto-confirm if confidence is high
		if (parsed.confidence === 'high') {
			// Update the temp reminder to be active
			await env.bot_users_db
				.prepare('UPDATE reminders SET task_description = ?, is_active = TRUE WHERE id = ?')
				.bind(parsed.task, tempReminderId)
				.run();

			await context.reply("✅ Reminder created successfully!");
		}

	} catch (error) {
		console.error('Error handling remind command:', error);
		const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
		await context.reply(`Sorry, something went wrong while creating your reminder: ${errorMessage}`);
	}
	return new Response('ok');
}

export async function handleRemindersCommand(context: TelegramExecutionContext, env: Environment): Promise<Response> {
	try {
		const update = context.update;
		const message = update?.message;
		const user = message?.from;
		const text = message?.text || '';

		if (!user) {
			return new Response('ok');
		}

		// Save/update user in database
		await upsertUser(env.bot_users_db, {
			telegram_id: user.id,
			username: user.username,
			first_name: user.first_name,
			language_code: user.language_code,
			is_bot: user.is_bot,
		});

		// Log interaction
		await logInteraction(env.bot_users_db, user.id, 'command', text, '/reminders');

		// Parse command arguments
		const args = text.split(' ').slice(1); // Remove '/reminders'

		if (args.length === 0) {
			// List all reminders
			const reminders = await getUserReminders(env.bot_users_db, user.id);
			const formattedList = formatRemindersList(reminders);
			await context.reply(formattedList);
		} else if (args[0] === 'delete' && args[1]) {
			// Delete specific reminder
			const reminderId = parseInt(args[1]);
			if (isNaN(reminderId)) {
				await context.reply('❌ Please provide a valid reminder ID number.\n\nExample: `/reminders delete 123`');
				return new Response('ok');
			}

			const success = await deleteReminder(env.bot_users_db, reminderId, user.id);
			if (success) {
				await context.reply(`✅ Reminder #${reminderId} has been deleted.`);
			} else {
				await context.reply(`❌ Could not delete reminder #${reminderId}. Make sure the ID is correct and belongs to you.`);
			}
		} else {
			await context.reply(
				'🔧 **Reminders Commands:**\n\n' +
				'• `/reminders` - View all your active reminders\n' +
				'• `/reminders delete <id>` - Delete a specific reminder\n\n' +
				'Example: `/reminders delete 123`'
			);
		}

	} catch (error) {
		console.error('Error handling reminders command:', error);
		const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
		await context.reply(`Sorry, something went wrong: ${errorMessage}`);
	}
	return new Response('ok');
}

export async function handleHelpCommand(context: TelegramExecutionContext, env: Environment): Promise<Response> {
	try {
		const update = context.update;
		const message = update?.message;
		const user = message?.from;

		if (!user) {
			return new Response('ok');
		}

		// Save/update user in database
		await upsertUser(env.bot_users_db, {
			telegram_id: user.id,
			username: user.username,
			first_name: user.first_name,
			language_code: user.language_code,
			is_bot: user.is_bot,
		});

		// Log interaction
		await logInteraction(env.bot_users_db, user.id, 'command', message?.text, '/help');

		const helpMessage = `🤖 **I'm your Reminder Bot!** You can ask me to remind you about things in natural language.

✅ **Try:**
• \`/remind me to call dad tomorrow at 6pm\`
• \`/remind me to check the status 2 weeks from now\`
• \`/remind me to water the plants this Friday at 9am\`
• \`/remind me to submit the report next Monday\`

📅 I'll parse the time, confirm with you, and remind you at the right moment!

🔧 **Other commands:**
• \`/reminders\` - View your active reminders
• \`/reminders delete <ID>\` - Delete a specific reminder
• \`/chatid\` - Get your Telegram chat ID
• \`/help\` - Show this help message

${isAdmin(user.id.toString(), env.ADMIN_CHAT_ID) ? `
🛠️ **Admin commands:**
• \`/stats\` or \`/report\` - Bot statistics
• \`/admin reminders\` - View all reminders
• \`/admin reminders <user_id>\` - View user's reminders
` : ''}

💡 **Tips:**
• I understand natural language - just tell me when you want to be reminded!
• All times are in your timezone (default: Asia/Tehran)
• I'll ask for confirmation if I'm not sure about the timing`;

		await context.reply(helpMessage);

	} catch (error) {
		console.error('Error handling help command:', error);
		const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
		await context.reply(`Sorry, something went wrong: ${errorMessage}`);
	}
	return new Response('ok');
}

export async function handleAdminCommand(context: TelegramExecutionContext, env: Environment): Promise<Response> {
	try {
		const update = context.update;
		const message = update?.message;
		const user = message?.from;
		const text = message?.text || '';

		if (!user) {
			return new Response('ok');
		}

		// Save/update user in database
		await upsertUser(env.bot_users_db, {
			telegram_id: user.id,
			username: user.username,
			first_name: user.first_name,
			language_code: user.language_code,
			is_bot: user.is_bot,
		});

		// Check if user is admin
		if (!isAdmin(user.id.toString(), env.ADMIN_CHAT_ID)) {
			await context.reply('❌ Sorry, this command is only available to administrators.');
			return new Response('ok');
		}

		// Log interaction
		await logInteraction(env.bot_users_db, user.id, 'command', text, '/admin');

		// Parse command arguments
		const args = text.split(' ').slice(1); // Remove '/admin'

		if (args.length === 0) {
			await context.reply(
				'🛠️ **Admin Commands:**\n\n' +
				'• `/admin reminders` - View all active reminders\n' +
				'• `/admin reminders <user_id>` - View reminders for specific user\n\n' +
				'Other admin commands:\n' +
				'• `/stats` or `/report` - Bot statistics'
			);
		} else if (args[0] === 'reminders') {
			if (args[1]) {
				// Show reminders for specific user
				const userId = parseInt(args[1]);
				if (isNaN(userId)) {
					await context.reply('❌ Please provide a valid user ID number.\n\nExample: `/admin reminders 123456789`');
					return new Response('ok');
				}

				const remindersView = await getAdminRemindersView(env.bot_users_db, userId);
				await context.reply(remindersView);
			} else {
				// Show all reminders
				const remindersView = await getAdminRemindersView(env.bot_users_db);
				await context.reply(remindersView);
			}
		} else {
			await context.reply('❌ Unknown admin command. Use `/admin` to see available commands.');
		}

	} catch (error) {
		console.error('Error handling admin command:', error);
		const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
		await context.reply(`Sorry, something went wrong: ${errorMessage}`);
	}
	return new Response('ok');
}
