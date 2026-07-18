// Resolve a product URL through Channel3, using the same code path the app does.
//
//   npx tsx --conditions=react-server --env-file=.env.local \
//     scripts/lookup-product.ts <url>
//
// The --conditions flag is required: channel3.ts imports "server-only", which
// throws unless Node resolves the react-server export condition.
//
// Handy for checking whether a retailer is supported before going live.
import { lookupProduct } from "../src/lib/channel3";

const url = process.argv[2];
if (!url) {
  console.error("Usage: tsx --env-file=.env.local scripts/lookup-product.ts <url>");
  process.exit(1);
}

async function main() {
  try {
    const product = await lookupProduct(url!);
    console.log(JSON.stringify(product, null, 2));
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

void main();
