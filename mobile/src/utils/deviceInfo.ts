/**
 * Device Information Utility
 * デバイス情報を自動収集するためのユーティリティ
 */

import * as Device from 'expo-device';
import * as Localization from 'expo-localization';
import type { DeviceInfo } from '../types';

/**
 * Collect device information for analytics
 * 分析用のデバイス情報を収集
 */
export async function collectDeviceInfo(): Promise<DeviceInfo> {
  try {
    const deviceInfo: DeviceInfo = {
      platform: Device.osName || 'unknown',
      os_version: Device.osVersion || undefined,
      timezone: Localization.timezone || undefined,
      locale: Localization.locale || undefined,
    };

    return deviceInfo;
  } catch (error) {
    console.error('[DeviceInfo] Failed to collect device information:', error);

    // Return minimal fallback info
    return {
      platform: 'unknown',
    };
  }
}

/**
 * Format device info for display
 * デバイス情報を表示用にフォーマット
 */
export function formatDeviceInfo(deviceInfo?: DeviceInfo): string {
  if (!deviceInfo) return '未設定';

  const parts: string[] = [];

  if (deviceInfo.platform) {
    parts.push(deviceInfo.platform);
  }

  if (deviceInfo.os_version) {
    parts.push(deviceInfo.os_version);
  }

  return parts.join(' ') || '未設定';
}
