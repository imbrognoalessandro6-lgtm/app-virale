// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    // Le Edge Functions girano su Deno, non nell'app.
    ignores: ["dist/*", "supabase/functions/*"],
  },
  {
    // Testi in italiano: gli apostrofi dentro <Text> sono normali in React Native.
    rules: { "react/no-unescaped-entities": "off" },
  },
]);
