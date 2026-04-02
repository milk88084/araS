import sharp from "sharp";
import { mkdirSync } from "fs";

mkdirSync("public/icons", { recursive: true });

const sizes = [192, 512];

for (const size of sizes) {
  const fontSize = Math.floor(size * 0.45);
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 17, g: 24, b: 39, alpha: 1 },
    },
  })
    .composite([
      {
        input: Buffer.from(
          `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
            <text x="50%" y="54%" font-family="serif" font-size="${fontSize}"
                  fill="white" text-anchor="middle" dominant-baseline="middle">¥</text>
          </svg>`
        ),
        top: 0,
        left: 0,
      },
    ])
    .png()
    .toFile(`public/icons/icon-${size}x${size}.png`);

  console.log(`✓ icon-${size}x${size}.png`);
}
