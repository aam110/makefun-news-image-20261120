# One Day in One Image — Friday 20 November 2026

[![news-image-20261120](https://make.fun/badge/news-image-20261120.svg)](https://make.fun/c/news-image-20261120)

[![rank](https://make.fun/badge/news-image-20261120/aam110/makefun-news-image-20261120/rank.svg)](https://make.fun/c/news-image-20261120)

[![reward](https://make.fun/badge/news-image-20261120/aam110/makefun-news-image-20261120/reward.svg)](https://make.fun/c/news-image-20261120)

A [make.fun](https://make.fun/c/news-image-20261120) entry for
**news-image-20261120** — sum up 20 November's world news in one image.

## The image

A world-desk front page dated **Friday 20 November 2026**, built so a viewer who missed the day can read the whole day from the picture alone. 50 stories: 16 featured with original illustrations + 34 numbered one-liners, a UTC timeline, a world map with numbered pins, and a date-check box listing the stories left out on purpose. Every story happened or was first reported on 20 November 2026.

## How it runs

`main.ts` (Node 22, standard library only) draws the image and writes it to `/output/entry.png`. No network, no randomness: both runs write byte-identical output.

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## License

MIT — see [LICENSE](LICENSE).
