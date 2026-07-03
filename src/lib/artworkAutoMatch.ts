import type { ArtworkSide } from '../types';

type ArtworkFileLike = {
  name: string;
  type?: string;
  webkitRelativePath?: string;
};

const IMAGE_EXTENSION_PATTERN = /\.(avif|bmp|gif|jpe?g|png|svg|webp)$/i;
const TOKEN_START = String.raw`(^|[\s._-])`;
const TOKEN_END = String.raw`($|[\s._-])`;

const SIDE_PATTERNS: Record<ArtworkSide, RegExp[]> = {
  front: [new RegExp(`${TOKEN_START}(front|face)${TOKEN_END}`, 'i'), /正面|前面|前侧/],
  back: [new RegExp(`${TOKEN_START}(back|rear)${TOKEN_END}`, 'i'), /背面|后面|反面/],
  left: [new RegExp(`${TOKEN_START}(left|left-side|lhs)${TOKEN_END}`, 'i'), /左侧|左面|左边/],
  right: [new RegExp(`${TOKEN_START}(right|right-side|rhs)${TOKEN_END}`, 'i'), /右侧|右面|右边/],
  top: [new RegExp(`${TOKEN_START}(top|lid)${TOKEN_END}`, 'i'), /顶部|顶面|上面|上盖/],
  bottom: [new RegExp(`${TOKEN_START}(bottom|base|underside)${TOKEN_END}`, 'i'), /底部|底面|下面|底面/],
};

export function matchArtworkSideByFilename(filename: string): ArtworkSide | null {
  const segments = filename.replace(/\\/g, '/').split('/').filter(Boolean).reverse();

  for (const segment of segments) {
    for (const side of Object.keys(SIDE_PATTERNS) as ArtworkSide[]) {
      if (SIDE_PATTERNS[side].some((pattern) => pattern.test(segment))) {
        return side;
      }
    }
  }

  return null;
}

export function isArtworkImageFile(file: ArtworkFileLike): boolean {
  return file.type?.startsWith('image/') === true || IMAGE_EXTENSION_PATTERN.test(file.name);
}

export function matchArtworkFilesBySide<T extends ArtworkFileLike>(files: T[]): Partial<Record<ArtworkSide, T>> {
  return files.reduce<Partial<Record<ArtworkSide, T>>>((matches, file) => {
    if (!isArtworkImageFile(file)) {
      return matches;
    }

    const filename = file.webkitRelativePath || file.name;
    const side = matchArtworkSideByFilename(filename);
    if (side && !matches[side]) {
      matches[side] = file;
    }

    return matches;
  }, {});
}
