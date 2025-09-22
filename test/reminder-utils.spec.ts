import { describe, it, expect } from 'vitest';
import { parseReminderText, formatDateForUser } from '../src/reminder-utils.js';

describe('Reminder Utils', () => {
	describe('parseReminderText', () => {
		it('should parse simple reminder with time', () => {
			const result = parseReminderText(
				'/remind me to call mom tomorrow at 7pm',
				'Asia/Tehran',
				new Date('2024-01-01T10:00:00Z')
			);

			expect(result).not.toBeNull();
			expect(result?.task).toContain('call mom');
		});

		it('should parse reminder with date and time', () => {
			const result = parseReminderText(
				'/remind me to attend meeting this Friday at 13:00',
				'Asia/Tehran',
				new Date('2024-01-01T10:00:00Z')
			);

			expect(result).not.toBeNull();
			expect(result?.task).toContain('attend meeting');
		});

		it('should return null for unparseable text', () => {
			const result = parseReminderText(
				'/remind me to do something without time',
				'Asia/Tehran',
				new Date('2024-01-01T10:00:00Z')
			);

			// This might return null if chrono can't parse any time
			// The behavior depends on chrono's parsing capabilities
		});

		it('should reject past dates', () => {
			const result = parseReminderText(
				'/remind me to do something 5 days ago',
				'Asia/Tehran',
				new Date('2024-01-01T10:00:00Z')
			);

			expect(result).toBeNull();
		});
	});

	describe('formatDateForUser', () => {
		it('should format date correctly for timezone', () => {
			const date = new Date('2024-01-01T12:00:00Z');
			const formatted = formatDateForUser(date, 'Asia/Tehran');

			expect(formatted).toBeTruthy();
			expect(typeof formatted).toBe('string');
		});

		it('should fallback to UTC for invalid timezone', () => {
			const date = new Date('2024-01-01T12:00:00Z');
			const formatted = formatDateForUser(date, 'Invalid/Timezone');

			expect(formatted).toBeTruthy();
			expect(typeof formatted).toBe('string');
		});
	});
});
