<script lang="ts">
	import { llama, type LlamaParams } from '$lib/llama';
	import Markdown from '../components/Markdown.svelte';

	const assistant_name = 'Assistant';
	const user_name = 'User';
	const host = 'http://localhost:8080';

	let end: HTMLSpanElement;

	interface ChatEvent {
		user: string;
		message: string;
	}

	let history: ChatEvent[] = [
		{
			user: 'system',
			message: 'You are an assistant helping the user.'
		}
	];

	function historyToString(h: ChatEvent[]) {
		return (
			h.map(({ user, message }) => `${user}: ${message}`).join('\n') + '\n' + assistant_name + ': '
		);
	}
	const params: LlamaParams = {
		stream: true,
		n_predict: 4096,
		temperature: 0.7,
		stop: ['</s>', assistant_name + ':', user_name + ':']
	};

	let chat = '';

	function handleSubmit(
		e: Event & {
			readonly submitter: HTMLElement | null;
		} & {
			currentTarget: EventTarget & HTMLFormElement;
		}
	) {
		e.preventDefault();

		history = [
			...history,
			{
				user: user_name,
				message: chat
			},
			{
				user: assistant_name,
				message: ''
			}
		];

		let prompt = historyToString(history);

		(async () => {
			for await (const result of llama(prompt, params)) {
				console.log('result: ', result);

				history[history.length - 1].message += result.data.content;
				// focus on end
				end.scrollIntoView({ behavior: 'smooth' });
			}
		})();

		chat = '';
	}
</script>

<div class="grid">
	<div class="output">
		{#each history as { user, message }}
			{#if user === 'system'}
				<div class="system">Initial: {message}</div>
			{:else}
				<div>
					<strong class="user">{user}</strong>: <Markdown source={message} />
				</div>
			{/if}
		{/each}
		<span bind:this={end} id="end" />
	</div>

	<form on:submit={handleSubmit} class="input">
		<input type="text" bind:value={chat} />
	</form>
</div>
