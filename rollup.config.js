import deckyPlugin from "@decky/rollup";

// Decky 3.2.4 uses LEGACY_EVAL_IIFE for all plugins: it eval()s the
// frontend_bundle endpoint (which serves dist/index.js). ESM `export`
// is invalid in eval() context, so we wrap the output in an IIFE and
// replace the export statement with `return index` so eval() yields
// the plugin factory function that Decky calls as plugin_export().
const wrapForDeckyEval = {
    name: 'wrap-for-decky-eval',
    renderChunk(code) {
        const modified = code.replace(/\nexport \{ index as default \};/, '\nreturn index;');
        return { code: `(function() {\n${modified}\n})()`, map: null };
    }
};

export default deckyPlugin({
    plugins: [wrapForDeckyEval]
});
