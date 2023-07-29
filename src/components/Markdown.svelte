<script lang="ts">
	import hljs from 'highlight.js';
	import { Marked } from 'marked';
	import { markedHighlight } from 'marked-highlight';

	export let source: string;

	const marked = new Marked(
		markedHighlight({
			langPrefix: 'hljs language-',
			highlight(code) {
				return hljs.highlightAuto(code.trimStart()).value;
			}
		})
	);

	$: parsed = marked.parse(source);
</script>

{@html parsed}
