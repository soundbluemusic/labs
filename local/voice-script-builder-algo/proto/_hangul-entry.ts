// Entry for esbuild to bundle the vendored @soundblue/hangul into a Node-importable ESM.
// Re-exports only what Tool 2's prototype needs. Vendored code itself is untouched.
export {
  decompose,
  compose,
  CHO,
  JUNG,
  JONG,
  toPronunciation,
  applyFinalConsonantRule,
} from '../../../src/lib/hangul/index.ts';
