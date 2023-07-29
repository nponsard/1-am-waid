// *Options:*

// `temperature`: Adjust the randomness of the generated text (default: 0.8).

// `top_k`: Limit the next token selection to the K most probable tokens (default: 40).

// `top_p`: Limit the next token selection to a subset of tokens with a cumulative probability above a threshold P (default: 0.9).

// `n_predict`: Set the number of tokens to predict when generating text. **Note:** May exceed the set limit slightly if the last token is a partial multibyte character. When 0, no tokens will be generated but the prompt is evaluated into the cache. (default: 128, -1 = infinity).

// `n_keep`: Specify the number of tokens from the initial prompt to retain when the model resets its internal context.
// By default, this value is set to 0 (meaning no tokens are kept). Use `-1` to retain all tokens from the initial prompt.

// `stream`: It allows receiving each predicted token in real-time instead of waiting for the completion to finish. To enable this, set to `true`.

// `prompt`: Provide a prompt. Internally, the prompt is compared, and it detects if a part has already been evaluated, and the remaining part will be evaluate. A space is inserted in the front like main.cpp does.

// `stop`: Specify a JSON array of stopping strings.
// These words will not be included in the completion, so make sure to add them to the prompt for the next iteration (default: []).

// `tfs_z`: Enable tail free sampling with parameter z (default: 1.0, 1.0 = disabled).

// `typical_p`: Enable locally typical sampling with parameter p (default: 1.0, 1.0 = disabled).

// `repeat_penalty`: Control the repetition of token sequences in the generated text (default: 1.1).

// `repeat_last_n`: Last n tokens to consider for penalizing repetition (default: 64, 0 = disabled, -1 = ctx-size).

// `penalize_nl`: Penalize newline tokens when applying the repeat penalty (default: true).

// `presence_penalty`: Repeat alpha presence penalty (default: 0.0, 0.0 = disabled).

// `frequency_penalty`: Repeat alpha frequency penalty (default: 0.0, 0.0 = disabled);

// `mirostat`: Enable Mirostat sampling, controlling perplexity during text generation (default: 0, 0 = disabled, 1 = Mirostat, 2 = Mirostat 2.0).

// `mirostat_tau`: Set the Mirostat target entropy, parameter tau (default: 5.0).

// `mirostat_eta`: Set the Mirostat learning rate, parameter eta (default: 0.1).

// `seed`: Set the random number generator (RNG) seed (default: -1, -1 = random seed).

// `ignore_eos`: Ignore end of stream token and continue generating (default: false).

// `logit_bias`: Modify the likelihood of a token appearing in the generated text completion. For example, use `"logit_bias": [[15043,1.0]]` to increase the likelihood of the token 'Hello', or `"logit_bias": [[15043,-1.0]]` to decrease its likelihood. Setting the value to false, `"logit_bias": [[15043,false]]` ensures that the token `Hello` is never produced (default: []).

export interface LlamaParams {
	temperature?: number;
	top_k?: number;
	top_p?: number;
	n_predict?: number;
	n_keep?: number;
	stream?: boolean;
	prompt?: string;
	stop?: string[];
	tfs_z?: number;
	typical_p?: number;
	repeat_penalty?: number;
	repeat_last_n?: number;
	penalize_nl?: boolean;
	presence_penalty?: number;
	frequency_penalty?: number;
	mirostat?: number;
	mirostat_tau?: number;
	mirostat_eta?: number;
	seed?: number;
	ignore_eos?: boolean;
	logit_bias?: number[][];
}

const paramDefaults = {
	stream: true,
	n_predict: 4096,
	temperature: 0.7,
	stop: ['</s>']
};

const host = 'http://localhost:8080';

export async function* llama(prompt: string, params: LlamaParams = {}) {
	const controller = new AbortController();

	const completionParams = { ...paramDefaults, ...params, prompt };

	const response = await fetch(host + '/completion', {
		method: 'POST',
		body: JSON.stringify(completionParams),
		headers: {
			Connection: 'keep-alive',
			'Content-Type': 'application/json',
			Accept: 'text/event-stream'
		},
		signal: controller.signal
	});

	const reader = response.body?.getReader();
	const decoder = new TextDecoder();

	if (!reader) {
		throw new Error('no reader');
	}

	let content = '';

	try {
		const cont = true;

		while (cont) {
			const result = await reader.read();

			const output: Record<string, any> = {};

			if (result.done) {
				break;
			}

			// sse answers in the form multiple lines of: value\n with data always present as a key. in our case we
			// mainly care about the data: key here, which we expect as json
			const text = decoder.decode(result?.value);

			// parse all sse events and add them to result
			const regex = /^(\S+):\s(.*)$/gm;
			for (const match of text.matchAll(regex)) {
				output[match[1]] = match[2];
			}

			// since we know this is llama.cpp, let's just decode the json in data
			output.data = JSON.parse(output.data);
			content += output.data.content;

			// yield
			yield output;

			// if we got a stop token from server, we will break here
			if (output.data.stop) {
				if (output.data.generation_settings) {
					const generation_settings = output.data.generation_settings;

					console.log('generation_settings: ', generation_settings);
				}
				break;
			}
		}
	} catch (e: any) {
		if (e.name !== 'AbortError') {
			console.error('llama error: ', e);
		}
		throw e;
	} finally {
		controller.abort();
	}

	return content;
}
