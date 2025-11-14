/**
 * SVGコンポーネントを画像に変換するユーティリティ
 */

import { captureRef } from 'react-native-view-shot';
import type { RefObject } from 'react';

/**
 * SVGコンポーネントのRefをPNG画像URIに変換
 *
 * @param svgRef - SVGコンポーネントへの参照
 * @param options - キャプチャオプション
 * @returns 一時ファイルのURI
 */
export const captureSvgToImage = async (
  svgRef: RefObject<any>,
  options?: {
    width?: number;
    height?: number;
    quality?: number;
  }
): Promise<string> => {
  if (!svgRef.current) {
    throw new Error('SVG ref is not available');
  }

  try {
    const uri = await captureRef(svgRef.current, {
      format: 'png',
      quality: options?.quality ?? 1,
      result: 'tmpfile',
      width: options?.width,
      height: options?.height,
    });

    if (!uri) {
      throw new Error('Failed to capture SVG');
    }

    return uri;
  } catch (error) {
    console.error('[svgToImage] Capture failed:', error);
    throw error;
  }
};

/**
 * リトライ機能付きSVGキャプチャ
 *
 * @param svgRef - SVGコンポーネントへの参照
 * @param options - キャプチャオプション
 * @param maxRetries - 最大リトライ回数
 * @returns 一時ファイルのURI
 */
export const captureSvgToImageWithRetry = async (
  svgRef: RefObject<any>,
  options?: {
    width?: number;
    height?: number;
    quality?: number;
  },
  maxRetries: number = 3
): Promise<string> => {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // 初回以外は待機
      if (attempt > 0) {
        const delay = 100 + attempt * 50;
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const uri = await captureSvgToImage(svgRef, options);
      console.log(`[svgToImage] Capture succeeded on attempt ${attempt + 1}`);
      return uri;
    } catch (error) {
      lastError = error as Error;
      console.warn(
        `[svgToImage] Capture attempt ${attempt + 1}/${maxRetries} failed:`,
        error
      );
    }
  }

  throw lastError ?? new Error('Failed to capture SVG after retries');
};
