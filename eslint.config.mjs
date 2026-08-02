import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const forbiddenColorPattern =
  /(?:bg-\[#|text-\[#|border-\[#|text-neutral-|text-gray-|bg-zinc-|text-zinc-|bg-neutral-|text-red-[0-9]|bg-red-[0-9])/;

/** Warn when class strings use hardcoded palette colors instead of globals.css tokens. */
const designTokensPlugin = {
  rules: {
    "no-hardcoded-colors": {
      meta: {
        type: "suggestion",
        docs: {
          description:
            "Prefer semantic design tokens from globals.css over hardcoded Tailwind palette colors.",
        },
        schema: [],
      },
      create(context) {
        function check(value, node) {
          if (typeof value === "string" && forbiddenColorPattern.test(value)) {
            context.report({
              node,
              message:
                "Use design tokens from globals.css (e.g. bg-muted, text-muted-foreground) instead of hardcoded colors.",
            });
          }
        }

        return {
          Literal(node) {
            check(node.value, node);
          },
          TemplateElement(node) {
            check(node.value.raw, node);
          },
        };
      },
    },
  },
};

const cinemaModeFiles = [
  "src/components/poll-overlay.tsx",
  "src/components/host-control-bar.tsx",
  "src/app/(chrome)/host/host-client.tsx",
  "src/components/video-placeholder.tsx",
  "src/components/watch-layout.tsx",
  "src/app/waitroom/[slug]/waitroom-client.tsx",
  "src/components/show-ended-viewer.tsx",
  "src/components/landing-show-demo.tsx",
  "src/app/watch/[playbackId]/player.tsx",
  "src/app/s/[slug]/show-page-client.tsx",
  "src/components/host-floating-studio.tsx",
  "src/components/show-trail-preview.tsx",
  "src/components/ui/dialog.tsx",
  "src/components/ui/sheet.tsx",
  "src/components/share-show-link-button.tsx",
  // Stream-flow prototype: a mock third-party storefront and an over-video
  // control bar — both are deliberately outside the app palette.
  "src/app/stream-flow/pieces.tsx",
  "src/app/stream-flow/share-picker.tsx",
  "src/app/stream-flow/host-popout.tsx",
  "src/app/stream-flow/live-studio.tsx",
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    plugins: {
      "design-tokens": designTokensPlugin,
    },
    rules: {
      "design-tokens/no-hardcoded-colors": "warn",
    },
  },
  {
    files: cinemaModeFiles,
    rules: {
      "design-tokens/no-hardcoded-colors": "off",
    },
  },
  {
    files: ["src/components/*-mockup.tsx"],
    rules: {
      "design-tokens/no-hardcoded-colors": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
