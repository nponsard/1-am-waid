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

	let systemMessage = 'You are an helpful assistant.';

	let history: ChatEvent[] = [];

	function historyToString(systemMessage: string, h: ChatEvent[]) {
		return (
			systemMessage +
			'\n' +
			h.map(({ user, message }) => `${user}: ${message}`).join('\n') +
			'\n' +
			assistant_name +
			': '
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

		let prompt = historyToString(systemMessage, history);

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
		<div class="system">
			Initial: <span bind:innerText={systemMessage} contenteditable />
		</div>
		{#each history as { user, message }}
			<div>
				<strong class="user">{user}</strong>: <Markdown source={message} />
			</div>
		{/each}
		<span bind:this={end} id="end" />
	</div>

	<form on:submit={handleSubmit} class="input">
		<input type="text" bind:value={chat} />
	</form>
</div>
