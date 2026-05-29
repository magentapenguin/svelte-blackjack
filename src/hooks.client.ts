import posthog from 'posthog-js';
import { env } from '$env/dynamic/public';
import type { HandleClientError } from '@sveltejs/kit';

export async function init() {
	const token = env.PUBLIC_POSTHOG_PROJECT_TOKEN;
	if (!token) return;

	posthog.init(token, {
		api_host: env.PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
		defaults: '2026-01-30',
		capture_exceptions: true,
		cookieless_mode: 'always',
		ui_host: 'https://us.posthog.com'
	});
}

export const handleError: HandleClientError = async ({ error, status, message }) => {
	posthog.captureException(error);
	return { message, status };
};
