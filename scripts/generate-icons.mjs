import sharp from "sharp";
import { writeFileSync } from "fs";

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="64" fill="#FFEB3B"/>
  <rect x="32" y="32" width="448" height="448" rx="48" fill="#000000" stroke="#FFEB3B" stroke-width="8"/>
  <text x="256" y="200" text-anchor="middle" font-family="monospace" font-weight="900" font-size="120" fill="#FFEB3B">FATE</text>
  <text x="256" y="340" text-anchor="middle" font-size="140">🎯</text>
  <rect x="80" y="390" width="352" height="6" rx="3" fill="#FFEB3B"/>
  <text x="256" y="460" text-anchor="middle" font-family="monospace" font-weight="700" font-size="48" fill="#FFEB3B">MARKET</text>
</svg>`;

for (const size of sizes) {
  const buffer = await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toBuffer();

  writeFileSync(`public/icon-${size}.png`, buffer);
  console.log(`Generated icon-${size}.png`);
}

const appleBuffer = await sharp(Buffer.from(svg))
  .resize(180, 180)
  .png()
  .toBuffer();
writeFileSync("public/apple-touch-icon.png", appleBuffer);
console.log("Generated apple-touch-icon.png");

const faviconBuffer = await sharp(Buffer.from(svg))
  .resize(32, 32)
  .png()
  .toBuffer();
writeFileSync("public/favicon-32x32.png", faviconBuffer);
console.log("Generated favicon-32x32.png");

const favicon16Buffer = await sharp(Buffer.from(svg))
  .resize(16, 16)
  .png()
  .toBuffer();
writeFileSync("public/favicon-16x16.png", favicon16Buffer);
console.log("Generated favicon-16x16.png");
